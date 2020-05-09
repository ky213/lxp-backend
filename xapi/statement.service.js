const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db'); 
const moment = require('moment');
require('moment-timezone');

module.exports = {
    getAll,
    getById,
    create,
    update,
    getExperiences
};

async function getAll(user, statementId, voidedStatementId, registration, agent, verbId, activityId, since, until, limit, ascending, experiences, page, take) {
    console.log("Get all statements:", statementId, voidedStatementId, registration, agent, verbId, activityId, since, until, limit, ascending, experiences, page, take)
    let offset = ((page || 1) - 1) * take;

    let model = knex.table('statements');

    if (statementId) {
        model.where('statementId', statementId);
    }

    if (registration) {
        model.whereRaw(`payload->'context'->>'registration' like ?`, [`${registration}|%`]);
        model.orWhereRaw(`payload->'context'->>'registration' = ?`, [registration]);
    }

    if(experiences) {
        const parsedExperiences = JSON.parse(experiences).map(pe => pe.value);
        parsedExperiences.map(pe => {
            model.whereRaw(`payload->'verb'->>'display' like ?`, [`%${pe}%`]);
            model.orWhereRaw(`payload->'verb'->>'display' like ?`, [`%${pe}%`]);
        })
        //parsedExperiences.join(',')
        //model.whereRaw(`payload->'verb'->>'display'->>'en' in (?)`, [parsedExperiences.join(',')]);
        //model.orWhereRaw(`payload->'verb'->>'display'->>'en-US' in (?)`, [parsedExperiences.join(',')]);
       // statement => statement.verb && statement.verb.display && (statement.verb.display.en || statement.verb.display["en-US"]
    }

    if (agent) {
        model.whereRaw(`payload->>'actor' = ?`, [agent]);
    }

    if (verbId) {
        model.whereRaw(`payload->'verb'->>'id' = ?`, [verbId]);
    }

    if (activityId) {
        model.whereRaw(`payload->'object'->>'objectType' = ?`, ["Activity"])
        model.whereRaw(`payload->'object'->>'id' = ?`, [activityId]);
    }

    if(since) {
        model.where('generated', '>=', moment(since, 'DDMMYYYY').startOf('day').toDate());
    }

    if(until) {
        model.where('generated', '<=', moment(until, 'DDMMYYYY').endOf('day').toDate());
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

async function getById(id, user) {
    return knex.select([
        'institutes.institute_id as instituteId', 
        'institutes.name', 
        'institutes.logo',
        'institutes.color_code as colorCode',       
        'institutes.background_color_code as backgroundColorCode', 
        'institutes.created_at as createdAt',
        'institutes.created_by as createdBy',
        'institutes.modified_at as modifiedAt',
        'institutes.modified_by as modifiedBy',
        'institutes.is_active as isActive'
    ])
    .from('institutes')
        .where('institutes.institute_id', id)
        .limit(1)
        .first()
    .then(function(output){
        return output;
    });
}

async function create(statement, statementId) {
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


