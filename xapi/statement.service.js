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
    //console.log("Get all statements:", statementId, voidedStatementId, registration, agent, verbId, activityId, since, until, limit, ascending, experiences, page, take)
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
        parsedExperiences.map(pe => {
            model.orWhereRaw(`payload->'verb'->>'display' like ?`, [`%${pe}%`]);
        })
    }

    if (agent) {
        const parsedAgent = JSON.parse(agent).map(n => n.fullName);    
        // then, create a dynamic list of comma-separated question marks
        let generateNames = ''; 
        parsedAgent.map((el, i) => {
            if (i == parsedAgent.length-1) return generateNames += `'${el}'`;
            else return generateNames += `'${el}',`;
        });

        model.whereRaw(`payload->'actor'->>'name' IN (${generateNames})`);
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


