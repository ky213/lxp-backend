const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db'); 

module.exports = {
    getAll,
    getById,
    create,
    update
};

async function getAll(user, pageId, recordsPerPage, filter) {
    //console.log("Get all institutes:", user, pageId, recordsPerPage, filter)
    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table('institutes');

    if (filter) {
        model.whereRaw(`LOWER(institutes.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    //console.log("Total rows:", totalNumberOfRecords)
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const institutes = await model.clone()        
        .orderBy('institutes.is_active', 'desc')
        .orderBy('institutes.created_at', 'desc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
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
        ]);

    //console.log("Got institutes:", institutes)
    return { institutes, totalNumberOfRecords: totalNumberOfRecords[0].count };
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

async function create(state, activityId, agent, stateId, registration) {
    return knex.transaction(async function(t) {

        await knex('activities_state')
        .transacting(t)
        .insert({
            activity_id: activityId,
            state_id: stateId,
            agent: agent,
            state: state,
            registration: registration
        });

    })
    .catch(err => {
        console.log('Create state error:', err);
        throw err;
    });
}


async function update(state, activityId, agent, stateId, registration) {
    return knex.transaction(async function(t) {

        await knex('activities_state')
        .transacting(t)
        .insert({
            activity_id: activityId,
            state_id: stateId,
            agent: agent,
            state: state,
            registration: registration
        });

    })
    .catch(err => {
        console.log('Create statement error:', err);
        throw err;
    });
}


