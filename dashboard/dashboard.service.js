const knex = require('../db');
const moment = require('moment');
const Role = require('helpers/role');
const fs = require('fs');
const path = require('path');
const {Storage} = require('@google-cloud/storage');

module.exports = {
    findProgressDistrubitionCompletedUserData,
    findProgressDistrubitionAttemptedUserData,
    findProgressDistrubitionNotAttemptedUserData,
    progressDistrubitionData,
    breakdownDistrubitionData,
    breakdownDistrubitionUsersSearch
};

var Readable = require('stream').Readable;
var cloudStorage = new Storage();
var bucket = process.env.STORAGE_BUCKET;

async function findProgressDistrubitionCompletedUserData(loggedInUser, programId, courseId, offset, pageSize) {
    if (!loggedInUser) {
        console.log("not authenticated")
        return;
    }
    if (loggedInUser.role === Role.Learner) {
        console.log("not authorized")
        return;
    }

    let completedUsers = knex.raw("select DISTINCT replace(payload->'actor'->>'mbox','mailto:','') as email, " +
        "(payload::json->'result'->'score'->>'raw') as score_raw, (payload::json->'result'->'score'->>'max') as score_max " +
        "from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "and (payload::json->'result'->'score'->>'raw') IS NOT NULL " +
        "and payload->'context'->>'registration' = ? offset ? limit ?", [programId + "|" + courseId, offset, pageSize])

    return await completedUsers.then(r => {

        var results = []
        r.rows.forEach(o => {
            results.push({
                email: o.email,
                score: o.score_raw,
                max_score: o.score_max,
            })
        })
        return results

    }).catch(err => {
        console.log(err)
    })
}

async function findProgressDistrubitionAttemptedUserData(loggedInUser, programId, courseId, offset, pageSize) {
    if (!loggedInUser) {
        console.log("not authenticated")
        return;
    }
    if (loggedInUser.role === Role.Learner) {
        console.log("not authorized")
        return;
    }

    let attemptedUsers = knex.raw("select DISTINCT replace(payload->'actor'->>'mbox','mailto:','') as email " +
        "from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/attempted' " +
        "and payload->'context'->>'registration' = ? " +
        "and payload->'actor'->>'mbox' not in (select DISTINCT payload->'actor'->>'mbox' " +
        "        from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "        and (payload::json->'result'->'score'->>'raw') IS NOT NULL " +
        "        and payload->'context'->>'registration' = ?) " +
        "offset ? limit ?", [programId + "|" + courseId, programId + "|" + courseId, offset, pageSize])

    return await attemptedUsers.then(r => {

        var results = []
        r.rows.forEach(o => {
            results.push({
                email: o.email,
            })
        })
        return results

    }).catch(err => {
        console.log(err)
    })
}

async function findProgressDistrubitionNotAttemptedUserData(loggedInUser, programId, courseId, offset, pageSize) {
    if (!loggedInUser) {
        console.log("not authenticated")
        return;
    }
    if (loggedInUser.role === Role.Learner) {
        console.log("not authorized")
        return;
    }

    let notAttemptedUsers = knex.raw("select email from users where email not in (select replace(payload->'actor'->>'mbox','mailto:','') as email " +
        "from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/attempted' " +
        "and payload->'context'->>'registration' = ?) order by email offset ? limit ?", [programId + "|" + courseId, offset, pageSize])

    return await notAttemptedUsers.then(r => {

        var results = []
        r.rows.forEach(o => {
            results.push({
                email: o.email,
            })
        })
        return results

    }).catch(err => {
        console.log(err)
    })
}


async function progressDistrubitionData(loggedInUser, organizationId, programId, courseId) {
    if (!loggedInUser) {
        console.log("not authenticated")
        return;
    }
    if (loggedInUser.role === Role.Learner) {
        console.log("not authorized")
        return;
    }

    console.log("progressDistributionData:", courseId);

    let pdAll = knex.raw(
        "select count(*)::integer as a from employees e inner join users u on e.user_id = u.user_id where e.is_learner = true and e.organization_id = ?",
        [organizationId]
    )

    let allUsers = await pdAll.then(f => {
        if (f.length === 0) {
            return 0
        }
        return f[0].a;
    });

    let completedQuery = knex.raw("select count(*)::integer as a from \"statements\" where " +
        "payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/passed' and " +
        "(payload::json#>'{result,score,max}') IS NOT NULL " +
        "and payload->'context'->>'registration' = ? " +
        "group by payload->'actor'->>'mbox', payload->'context'->>'registration'", [programId + "|" + courseId]);

    let completed = await completedQuery
        .then(f => {
            if (f.rows.length === 0) {
                return 0
            }

            return f.rows[0].a;
        }).catch(err => console.log(err));

    let inProgressQuery = knex.raw("select count(*)::integer as a from (select count(*)::integer as c " +
        "from \"statements\" where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/attempted' " +
        "and payload->'context'->>'registration' = ? " +
        "group by payload->'actor'->>'mbox', payload->'context'->>'registration') as st", [programId + "|" + courseId])

    let inProgress = await inProgressQuery.then(f => {
        if (f.rows.length === 0) {
            return 0
        }

        return f.rows[0].a - completed;
    }).catch(err => console.log(err));


    return {
        "allUsers": allUsers,
        "completed": completed,
        "inProgress": inProgress
    }
}


async function breakdownDistrubitionData(loggedInUser, programId, courseId) {
    if (!loggedInUser) {
        console.log("not authenticated")
        return;
    }
    if (loggedInUser.role === Role.Learner) {
        console.log("not authorized")
        return;
    }

    console.log("breakdownDistrubitionData:", programId, courseId);


    var dateOffset = (24 * 60 * 60 * 1000) * 30; //30 days
    var breakdownDate = new Date();
    breakdownDate.setTime(breakdownDate.getTime() - dateOffset);

    let collectedPointsDistribution = knex.raw("select answered_questions,count(*) as count from (select replace(payload -> 'actor' ->> 'mbox', 'mailto:', ''), count(*) as answered_questions, max(generated) as last_generated " +
        "from \"statements\" " +
        "where payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' " +
        "and payload -> 'result' ->> 'success' = 'true' " +
        "and payload -> 'context' ->> 'registration' = ? " +
        "group by 1 ) as st " +
        "where st.last_generated < ? " +
        "group by st.answered_questions", [programId + "|" + courseId], breakdownDate);


    return await collectedPointsDistribution.then(f => {

        if (f.rows.length === 0) {
            return 0
        }

        return {
            points: f.rows[0].answered_questions,
            count: f.rows[0].count
        };
    })
}

async function breakdownDistrubitionUsersSearch(loggedInUser, programId, courseId, minAnswers, maxAnswers, offset, pageSize) {
    if (!loggedInUser) {
        console.log("not authenticated")
        return;
    }
    if (loggedInUser.role === Role.Learner) {
        console.log("not authorized")
        return;
    }

    console.log("breakdownDistrubitionData:", programId, courseId);

    var dateOffset = (24 * 60 * 60 * 1000) * 30; //30 days
    var breakdownDate = new Date();
    breakdownDate.setTime(breakdownDate.getTime() - dateOffset);

    let collectedPointsDistribution = knex.raw("select st.email ,st.answers_count, st.last_generated_statement from (select replace(payload -> 'actor' ->> 'mbox', 'mailto:', '') as email, count(*) as answers_count, max(generated) as last_generated_statement " +
        "from \"statements\" " +
        "where payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' " +
        "and payload -> 'result' ->> 'success' = 'true' " +
        "and payload -> 'context' ->> 'registration' = ? " +
        "group by 1 ) as st " +
        "where st.answers_count > ? " +
        "and st.answers_count < ? " +
        "and st.last_generated < ? " +
        "order by st.email offset ? limit ? "
        , [programId + "|" + courseId, minAnswers, maxAnswers, breakdownDate, offset, pageSize]);


    return await collectedPointsDistribution.then(f => {

        let results = []
        f.rows.forEach(r => {
            results.push({
                email: r.email,
                answers_count: r.answers_count,
                last_generated_statement: r.last_generated_statement
            })
        })

        return results;
    })


}
