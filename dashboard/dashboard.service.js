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
    breakdownDistrubitionUsersSearch,
    getUserProfile
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

    let completedUsers = knex.raw("select * from (select a.email, " +
        "                      sum(a.answers_count)        as answers_count, " +
        "                      sum(a.score_raw)            as score_raw, " +
        "                      sum(response_success_count) as response_success_count, " +
        "                      sum(response_fail_count)    as response_fail_count, " +
        "                      sum(final_score_raw)        as final_score_raw, " +
        "                      bool_or(passed) as passed " +
        "               from ( " +
        "                        select replace(payload -> 'actor' ->> 'mbox', 'mailto:', '') as email, " +
        "                               payload -> 'result' ->> 'response'                    as response, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'true') " +
        "                                           THEN (payload::json -> 'result' -> 'score' ->> 'raw')::numeric " +
        "                                       ELSE 0 END)                                   as score_raw, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered') " +
        "                                           THEN 1 " +
        "                                       ELSE 0 END)                                   as answers_count, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'true') THEN 1 " +
        "                                       ELSE 0 END)                                   as response_success_count, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'false') THEN 1 " +
        "                                       ELSE 0 END)                                   as response_fail_count, " +
        "                               MAX(CASE " +
        "                                       WHEN payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "                                           THEN (payload::json -> 'result' -> 'score' ->> 'raw')::numeric " +
        "                                       ELSE 0 END)                                   as final_score_raw, " +
        "                               bool_or(CASE WHEN payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "                                   THEN true ELSE false END) as passed " +
        "                        from statements " +
        "                        where payload -> 'context' ->> 'registration' = ? " +
        "                        group by 1, 2 " +
        "                    ) as a " +
        "               group by 1 " +
        "              ) as st " +
        "join users u on u.email=st.email " +
        "where  st.passed = true " +
        "offset ? limit ? ",
        [programId + "|" + courseId, offset, pageSize]);

    return await completedUsers.then(r => {

        var results = []
        r.rows.forEach(r => {
            results.push({
                userId: r.user_id,
                email: r.email,
                scores: r.score_raw,
                answers_count: r.answers_count,
                response_success_count: r.response_success_count,
                response_fail_count: r.response_fail_count,
                name: r.name,
                surname: r.surname,
                gender: r.gender,
                start_date: r.start_date,
                phone_number: r.phone_number,
                pager_number: r.pager_number
            })
        })
        return results

    }).catch(err => {
        console.log(err);
        throw err;
    });
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

    let attemptedUsers = knex.raw("select * from (select a.email, " +
        "                      sum(a.answers_count)        as answers_count, " +
        "                      sum(a.score_raw)            as score_raw, " +
        "                      sum(response_success_count) as response_success_count, " +
        "                      sum(response_fail_count)    as response_fail_count, " +
        "                      sum(final_score_raw)        as final_score_raw, " +
        "                      bool_or(passed) as passed " +
        "               from ( " +
        "                        select replace(payload -> 'actor' ->> 'mbox', 'mailto:', '') as email, " +
        "                               payload -> 'result' ->> 'response'                    as response, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'true') " +
        "                                           THEN (payload::json -> 'result' -> 'score' ->> 'raw')::numeric " +
        "                                       ELSE 0 END)                                   as score_raw, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered') " +
        "                                           THEN 1 " +
        "                                       ELSE 0 END)                                   as answers_count, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'true') THEN 1 " +
        "                                       ELSE 0 END)                                   as response_success_count, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'false') THEN 1 " +
        "                                       ELSE 0 END)                                   as response_fail_count, " +
        "                               MAX(CASE " +
        "                                       WHEN payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "                                           THEN (payload::json -> 'result' -> 'score' ->> 'raw')::numeric " +
        "                                       ELSE 0 END)                                   as final_score_raw, " +
        "                               bool_or(CASE WHEN payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "                                   THEN true ELSE false END) as passed " +
        "                        from statements " +
        "                        where payload -> 'context' ->> 'registration' = ? " +
        "                        group by 1, 2 " +
        "                    ) as a " +
        "               group by 1 " +
        "              ) as st " +
        "join users u on u.email=st.email " +
        "where  st.passed = false " +
        "offset ? limit ? ",
        [programId + "|" + courseId, offset, pageSize]);
    return await attemptedUsers.then(r => {

        var results = []
        r.rows.forEach(r => {
            results.push({
                userId: r.user_id,
                email: r.email,
                scores: r.score_raw,
                answers_count: r.answers_count,
                response_success_count: r.response_success_count,
                response_fail_count: r.response_fail_count,
                name: r.name,
                surname: r.surname,
                gender: r.gender,
                start_date: r.start_date,
                phone_number: r.phone_number,
                pager_number: r.pager_number
            })
        })
        return results

    }).catch(err => {
        console.log(err);
        throw err;
    });
}

async function findProgressDistrubitionNotAttemptedUserData(loggedInUser, orgranizationId, programId, courseId, offset, pageSize) {
    if (!loggedInUser) {
        console.log("not authenticated")
        return;
    }
    if (loggedInUser.role === Role.Learner) {
        console.log("not authorized")
        return;
    }

    let notAttemptedUsers = knex.raw( "select * from users u " +
        "         left join employees e on e.user_id = u.user_id " +
        "where e.is_learner = true and e.organization_id = ? " +
        "         and u.email not in (select distinct replace(payload->'actor'->>'mbox','mailto:','') as email " +
        "         from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/attempted' " +
        "         and payload->'context'->>'registration' = ?) " +
        "         order by u.email offset ? limit ? ",
        [ orgranizationId, programId + "|" + courseId, offset, pageSize])

    return await notAttemptedUsers.then(r => {

        var results = []
        r.rows.forEach(r => {
            results.push({
                userId: r.user_id,
                email: r.email,
                scores: null,
                answers_count: null,
                response_success_count: null,
                response_fail_count: null,
                name: r.name,
                surname: r.surname,
                gender: r.gender,
                start_date: r.start_date,
                phone_number: r.phone_number,
                pager_number: r.pager_number
            })
        })
        return results

    }).catch(err => {
        console.log(err);
        throw err;
    });
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
        if (f.rows.length === 0) {
            return 0
        }
        return f.rows[0].a;
    }).catch(err => {
        console.log(err);
        throw err;
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
        }).catch(err => {
            console.log(err);
            throw err;
        });

    let inProgressQuery = knex.raw("select count(*)::integer as a from (select count(*)::integer as c " +
        "from \"statements\" where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/attempted' " +
        "and payload->'context'->>'registration' = ? " +
        "group by payload->'actor'->>'mbox', payload->'context'->>'registration') as st", [programId + "|" + courseId])

    let inProgress = await inProgressQuery.then(f => {
        if (f.rows.length === 0) {
            return 0
        }

        return f.rows[0].a - completed;
    }).catch(err => {
        console.log(err);
        throw err;
    });


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


    var dateOffset = (24 * 60 * 60 * 1000) * 0; //for now we set 0 days but we should consider to change to 14 or 30 days
    var breakdownDate = new Date();
    breakdownDate.setTime(breakdownDate.getTime() - dateOffset);

    let collectedPointsDistribution = knex.raw(
        "select answered_questions,count(*) from (" +
        "   select actor, count(*) as answered_questions, max(generated) as last_generated " +
        "   from (" +
        "       select (payload -> 'result' ->> 'response')::text as response, " +
        "           replace(payload -> 'actor' ->> 'mbox', 'mailto:', '')::text as actor, " +
        "           (payload -> 'result' -> 'score' ->> 'raw')::numeric as score, " +
        "           max(generated) as generated " +
        "       from statements " +
        "       where payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' " +
        "       and payload -> 'result' ->> 'success' = 'true' " +
        "       and payload -> 'context' ->> 'registration' = ? " +
        "       and payload->'actor'->>'mbox' not in (" +
        "           select DISTINCT payload->'actor'->>'mbox' " +
        "           from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "           and (payload::json->'result'->'score'->>'raw') IS NOT NULL " +
        "           and payload->'context'->>'registration' = ? ) " +
        "        group by 1,2,3) as foo " +
        "   group by 1 " +
        "   ) as st " +
        "where st.last_generated < ? " +
        "group by st.answered_questions ",
        [programId + "|" + courseId, programId + "|" + courseId, breakdownDate]
    );

    let answersDistribution = await collectedPointsDistribution.then(f => {

        if (f.rows.length === 0) {
            return [];
        }

        return f.rows.map(r => ({
            success_answers: r.answered_questions,
            number_of_users: r.count
        }));
    }).catch(err => {
        console.log(err);
        throw err;
    });

    let totalBreakdownUserNumber = knex.raw(
        " select count(*) as total_breakdown_users_number from ( " +
        "   select " +
        "       replace(payload -> 'actor' ->> 'mbox', 'mailto:', '')::text as actor," +
        "       max(generated) as last_generated " +
        "   from statements " +
        "   where payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' " +
        "   and payload -> 'result' ->> 'success' = 'true' " +
        "   and payload -> 'context' ->> 'registration' = ? " +
        "   and payload->'actor'->>'mbox' not in (" +
        "       select DISTINCT payload->'actor'->>'mbox' " +
        "       from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "       and (payload::json->'result'->'score'->>'raw') IS NOT NULL " +
        "       and payload->'context'->>'registration' = ? " +
        "       ) " +
        "       group by 1 " +
        ") as foo " +
        "where foo.last_generated < ?",
        [programId + "|" + courseId, programId + "|" + courseId, breakdownDate]
    )

    let totalNum = await totalBreakdownUserNumber.then(f => {

        if (f.rows.length === 0) {
            return 0;
        }

        return f.rows[0].total_breakdown_users_number;

    }).catch(err => {
        console.log(err);
        throw err;
    });


    return {
        totalBreakdownUsersCount: totalNum,
        breakDownAnswersDistribution: answersDistribution
    }

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

    if (!minAnswers) {
        minAnswers = 0
    }

    if (!maxAnswers) {
        maxAnswers = 1000
    }

    console.log("breakdownDistrubitionData:", programId, courseId);

    // var dateOffset = (24 * 60 * 60 * 1000) * 0; //30 days
    // var breakdownDate = new Date();
    // breakdownDate.setTime(breakdownDate.getTime() - dateOffset);

    let collectedPointsDistribution = knex.raw(
        "select * from (select st.email ,count(st.response) as answers_count, sum(st.score) as scores ,sum(response_success_count) as response_success_count, sum(response_fail_count) as response_fail_count from ( " +
        "    select " +
        "            replace(payload -> 'actor' ->> 'mbox', 'mailto:', '') as email, " +
        "            (payload -> 'result' -> 'score' ->> 'raw')::numeric as score, " +
        "            (payload -> 'result' ->> 'response')::text as response, " +
        "            SUM(CASE WHEN payload -> 'result' ->> 'success' = 'true' THEN 1 ELSE 0 END) as response_success_count, " +
        "            SUM(CASE WHEN payload -> 'result' ->> 'success' = 'false' THEN 1 ELSE 0 END) as response_fail_count, " +
        "            max(generated) as last_generated_statement " +
        "            from statements " +
        "            where payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' " +
        "            and payload -> 'context' ->> 'registration' = ? " +
        "                                                  and payload->'actor'->>'mbox' not in (select DISTINCT payload->'actor'->>'mbox' " +
        "                                                    from statements where payload->'verb'->>'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "                                                    and (payload::json->'result'->'score'->>'raw') IS NOT NULL " +
        "                                                    and payload->'context'->>'registration' = ? ) " +
        "            group by 1,2,3 " +
        "    ) as st " +
        "    where st.last_generated_statement < now() " +
        "    group by st.email " +
        "    having count(st.response) > ? and count(st.response) < ? " +
        "    order by st.email offset ? limit ? ) as stat " +
        "    join users u on u.email = stat.email"

        , [programId + "|" + courseId, programId + "|" + courseId, minAnswers, maxAnswers, offset, pageSize]);


    return await collectedPointsDistribution.then(f => {

        let results = []
        f.rows.forEach(r => {
            results.push({
                userId: r.user_id,
                email: r.email,
                answers_count: r.answers_count,
                response_success_count: r.response_success_count,
                response_fail_count: r.response_fail_count,
                scores: r.scores,
                name: r.name,
                surname: r.surname,
                gender: r.gender,
                start_date: r.start_date,
                phone_number: r.phone_number,
                pager_number: r.pager_number
            })
        })

        return results;
    }).catch(err => {
        console.log(err);
        throw err;
    });


}

async function getUserProfile(loggedInUser, choosenUserId) {
    let getUserProfileData = knex.raw("select * from users where user_id = ?", [choosenUserId]);

    let userProfiledata = await getUserProfileData.then(f => {

        if(f.rows.length===0){
            throw 'user with id '+choosenUserId+' cannot be found'
        }

        r=f.rows[0]
        return {
            userId: r.user_id,
            email: r.email,
            answers_count: r.answers_count,
            response_success_count: r.response_success_count,
            response_fail_count: r.response_fail_count,
            scores: r.scores,
            name: r.name,
            surname: r.surname,
            gender: r.gender,
            start_date: r.start_date,
            phone_number: r.phone_number,
            pager_number: r.pager_number
        }
    }).catch(err => {
        console.log(err);
        throw err;
    });


    let getCoursesData = knex.raw("select " +
        "       c.course_id, " +
        "       c.organization_id, " +
        "       c.program_id, " +
        "       c.name as course_name, " +
        "       starting_date, " +
        "       joining_date, " +
        "       o.name as orgranization_name, " +
        "       p.name as program_name " +
        " " +
        "from courses c " +
        "join user_courses uc on c.course_id = uc.course_id " +
        "join organizations o on o.organization_id = c.organization_id " +
        "join programs p on c.program_id = p.program_id " +
        "where uc.user_id= ? ", [choosenUserId]);

    let coursesData = await getCoursesData.then(f => {
        if (f.rows.length === 0) {
            return [{}]
        }

        return f.rows.map(r => ({
            course_id: r.course_id,
            orgranization_id: r.organization_id,
            program_id: r.program_id,
            course_name: r.course_name,
            starting_date: r.starting_date,
            joining_date: r.joining_date,
            orgranization_name: r.orgranization_name,
            program_name: r.program_name

        }));

    }).catch(err => {
        console.log(err);
        throw err;
    });


    let getCoursesResultsQuery = "select a.email, " +
        "                      sum(a.answers_count)        as answers_count, " +
        "                      sum(a.score_raw)            as score_raw, " +
        "                      sum(response_success_count) as response_success_count, " +
        "                      sum(response_fail_count)    as response_fail_count, " +
        "                      sum(final_score_raw)        as final_score_raw, " +
        "                      bool_or(passed) as passed " +
        "               from ( " +
        "                        select replace(payload -> 'actor' ->> 'mbox', 'mailto:', '') as email, " +
        "                               payload -> 'result' ->> 'response'                    as response, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'true') " +
        "                                           THEN (payload::json -> 'result' -> 'score' ->> 'raw')::numeric " +
        "                                       ELSE 0 END)                                   as score_raw, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered') " +
        "                                           THEN 1 " +
        "                                       ELSE 0 END)                                   as answers_count, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'true') THEN 1 " +
        "                                       ELSE 0 END)                                   as response_success_count, " +
        "                               MAX(CASE " +
        "                                       WHEN (payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/answered' and " +
        "                                             payload -> 'result' ->> 'success' = 'false') THEN 1 " +
        "                                       ELSE 0 END)                                   as response_fail_count, " +
        "                               MAX(CASE " +
        "                                       WHEN payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "                                           THEN (payload::json -> 'result' -> 'score' ->> 'raw')::numeric " +
        "                                       ELSE 0 END)                                   as final_score_raw, " +
        "                               bool_or(CASE WHEN payload -> 'verb' ->> 'id' = 'http://adlnet.gov/expapi/verbs/passed' " +
        "                                   THEN true ELSE false END) as passed " +
        "                        from statements " +
        "                        where " +
        "                           payload -> 'context' ->> 'registration' = ? " +
        "                           and payload -> 'actor' ->> 'mbox'= ? " +
        "                        group by 1, 2 " +
        "                    ) as a " +
        "               group by 1 ";


    var promises=[]
    coursesData.forEach((c,i ) => {
        queryP = knex.raw(getCoursesResultsQuery,
            [c.program_id + "|" + c.course_id, 'mailto:' + userProfiledata.email]).
        then(f=>{
            if(f.rows.length===0){
                return
            }
            let r=f.rows[0]
            console.log("filling course data for ",i)
            coursesData[i].answers_count = r.answers_count;
            coursesData[i].score_raw = r.score_raw;
            coursesData[i].response_success_count = r.response_success_count;
            coursesData[i].response_fail_count = r.response_fail_count;
            coursesData[i].passed = r.passed;
        }).catch(err => {
            console.log(err);
            throw err;
        });
        promises.push(queryP)
    })

    await Promise.all(promises).then(f=>{
        console.log("All accomplished")
    }).catch(err => {
        console.log(err);
        throw err;
    });

    userProfiledata.coursesData=coursesData;

    return userProfiledata;

}
