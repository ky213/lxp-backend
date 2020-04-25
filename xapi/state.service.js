const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db'); 

module.exports = {
    getById,
    create,
    update
};
/*
stateId=resume&activityId=http%3A%2F%2F6knKUXs5R3S_course_id&agent=%7B%22objectType%22%3A%22Agent%22%2C%22mbox%22%3A%22mailto%3Anebojsa.pongracic%40gmail.com%22%2C%22name%22%3A%22Neboj%C5%A1a%20Pongra%C4%8Di%C4%87%22%7D&registration=306b969e-e7c0-46cf-aeb8-32be7bbf7a14", {
*/

async function getById(activityId, agent, stateId, registration) {
    return await knex.select([
        'state'
    ])
    .from('activities_state')
        .where('activities_state.activity_id', activityId)
        .andWhere('activities_state.agent', agent)
        .andWhere('activities_state.state_id', stateId)
        .limit(1)
        .first();
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


