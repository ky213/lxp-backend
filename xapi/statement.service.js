const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db'); 
const moment = require('moment');
require('moment-timezone');
const organizationService = require('../organizations/organization.service');

module.exports = {
    getAll,
    getById,
    create,
    update,
    getExperiences,
    getExperiencesForUser
};

async function getAll(user, statementId, voidedStatementId, registration, agent, verbId, activityId, since, until, limit, ascending, experiences, page, take) {
    if (!user) {
        console.log("not authenticated")
        return;
    }

    if (!registration) {
        console.log("You have to select a Program")
        return;
    }

    let offset = ((page || 1) - 1) * take;

    let model = knex.table('statements');

    if (statementId) {
        model.where('statementId', statementId);
    }

    if (registration) {
        model.whereRaw(`payload->'context'->>'registration' like ?`, [`${registration}%`]);
    }

    if(experiences) {
        const parsedExperiences = JSON.parse(experiences).map(pe => pe.value);
        
        let generateExperiences = ''; 
        parsedExperiences.map((el, i) => {
            if (i == parsedExperiences.length-1) return generateExperiences += `'${el}'`;
            else return generateExperiences += `'${el}',`;
        });

        model.whereRaw(`payload->'verb'->'display'->>'en-US' IN (${generateExperiences})`);

    }

    if (agent && agent.length > 10 ) { 
        const parsedAgent = JSON.parse(agent).map(n => n.email);    
        // then, create a dynamic list of comma-separated question marks
        let generateEmails = ''; 
        parsedAgent.map((el, i) => {
            if (i == parsedAgent.length-1) 
                return generateEmails += `'mailto:${el}'`;
            else 
                return generateEmails += `'mailto:${el}',`;
        });

        if(generateEmails)
        {
            model.whereRaw(`payload->'actor'->>'mbox' IN (${generateEmails})`);}
    }

    if (verbId) {
        model.whereRaw(`payload->'verb'->>'id' = ?`, [verbId]);
    }

    if (activityId) {
        model.whereRaw(`payload->'object'->>'objectType' = ?`, ["Activity"])
        model.whereRaw(`payload->'object'->>'id' = ?`, [activityId]);
    }

    if(since) {
        var strToDate = new Date(since);
        since = moment(strToDate).format("YYYY-MM-DD");
        console.log(since);
        model.whereRaw(`payload->>'timestamp' >= ?`, [`${since}`]);
    }

    if(until) {
        var strToDate = new Date(until);
        until = moment(strToDate).format("YYYY-MM-DD");
        console.log(until);
        model.whereRaw(`payload->>'timestamp' <= ?`, [`${until}`]);
    }

    if(page && take) {
        const totalNumberOfRecords = await model.clone().count();
        //console.log("Total rows:", totalNumberOfRecords)
        if (totalNumberOfRecords[0].count <= offset) {
            offset = 0;
        }

        model.orderBy(knex.raw(`payload->>'timestamp'`), ascending ? 'asc': 'desc');
    
        const statements = await model.clone()          
            .offset(offset)
            .limit(take)
            .select([
                knex.raw(`payload->>'timestamp'`),
                'payload', 
            ]);

           console.log(model.clone()          
           .offset(offset)
           .limit(take)
           .select([
               knex.raw(`payload->>'timestamp'`),
               'payload', 
           ]).toSQL().toNative() ) 

        return { statements: statements.map(s => s.payload), totalNumberOfRecords: totalNumberOfRecords[0].count };
    }
    else {
        if(limit) {
            model.limit(limit);
        }
        model.orderBy(knex.raw(`payload->>'timestamp'`), ascending ? 'asc': 'desc');
        const statements = await model.clone()          
            .select([
                'payload', 
            ]);

        return { statements: statements.map(s => s.payload), more: `page=${(page || 1) + 1}` };
    }
}

async function getExperiences(user, programId) {
    //console.log("Get all experiences:", user, programId)
    if (programId) {
        model.whereRaw(`payload->'context'->>'registration' like ?`, [`${programId}|%`]);
    }

    return await knex.table('statements').select(knex.raw(`payload->'verb'->>'display' as experience`)).distinct();
}

async function getExperiencesForUser(registration, agent) {
    console.log("getExperiencesForUser: ", registration, agent[0]);

    let courseId = registration ? registration.substring(registration.indexOf('|') +1) : null;
    let userEmail = agent && agent[0] ? agent[0].substring(agent[0].indexOf(':') + 1) : null;
    const verbId = 'http://adlnet.gov/expapi/verbs/experienced';
    let model = knex.table('statements');

    if (registration) {
        model.whereRaw(`payload->'context'->>'registration' like ?`, [`${registration}`]);
    }

    if (agent && agent.length > 0 ) {         
        model.whereRaw(`payload->'actor'->>'mbox' = ?`,[`${[agent[0]]}`]);
    }

    model.whereRaw(`payload->'verb'->>'id' = ?`, [verbId]);
    model.whereRaw(`payload->'object'->>'objectType' = ?`, ['Activity']);

    const statements = await model.clone()          
            .select(knex.raw(`payload->'object'->>'id' as  activity`)).distinct();
    console.log('statements => ' , statements , courseId);

    if (statements)
    {
        let user = await knex('users')
        .where('users.email', userEmail.toLowerCase())
        .select(['users.user_id as userId'])
        .first();

        await knex("user_courses")
        .where('course_id', courseId)
        .andWhere('user_id', user.userId )
        .update({
            activity_numbers_completed: statements.length 
        })
        .catch(error => { 
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });
    }

    return {isValid: true};    
}

async function getById(id, user) {
    return knex.select([
        'organizations.organization_id as organizationId', 
        'organizations.name', 
        'organizations.logo',
        'organizations.color_code as colorCode',       
        'organizations.background_color_code as backgroundColorCode', 
        'organizations.created_at as createdAt',
        'organizations.created_by as createdBy',
        'organizations.modified_at as modifiedAt',
        'organizations.modified_by as modifiedBy',
        'organizations.is_active as isActive'
    ])
    .from('organizations')
        .where('organizations.organization_id', id)
        .limit(1)
        .first()
    .then(function(output){
        return output;
    });
}

async function sendCertificateEmail(registration,actorEmail) {

    let courseId = registration.substring(registration.indexOf('|') + 1);
    let programId = registration.substring(0, registration.indexOf('|'));
    let userEmail = actorEmail.substring(actorEmail.indexOf(':') + 1);

    let program = await knex('programs')
    .where('programs.program_id', programId)
    .select([ 'programs.organization_id as organizationId' ,
    'programs.certifcate_subject as subject',
    'programs.certifcate_body as body'
     ])
    .first();

    let user = await knex('users')
    .where('users.email', userEmail.toLowerCase())
    .select(['users.user_id as userId' , 'users.name as UserName' , 'users.surname as UserLastName' ])
    .first();

    let course = await knex('courses')
    .where('courses.course_id', courseId)
    .select(['courses.name as Name' ])
    .first();

    user.organization = program.organizationId;

    if(program.body)
    {
        var email = {  UserName: user.UserName , CourseName : course.Name ,  organizationId: program.organizationId , UserId : user.userId ,
            isCertificate : 'TRUE'  , UserEmail : userEmail , Body: program.body , Subject: program.subject , UserLastName: user.UserLastName };
        await organizationService.sendEmail(email, user);
    }
}

async function create(statement, statementId) {

    if(statement.verb.id == 'http://adlnet.gov/expapi/verbs/completed' || 
    statement.verb.id == 'http://adlnet.gov/expapi/verbs/passed'){    
        console.log('statement.verb.id ', statement.verb.id);
        await sendCertificateEmail(statement.context.registration ,statement.actor.mbox);
    }
    
    console.log('create =>  ' );
    return knex.transaction(async function(t) {

        await knex('statements')
        .transacting(t)
        .insert({
            statement_id: statementId,
            payload: statement
        });

    })
    .catch(err => {
        console.log('Create satement error:', err);
        throw err;
    });
}


async function update(statement, statementId) {
    return knex.transaction(async function(t) {

        await knex('statements')
        .transacting(t)
        .where('statement_id', statementId)
        .update({
            payload: statement
        });

    })
    .catch(err => {
        console.log('Create statement error:', err);
        throw err;
    });
}


