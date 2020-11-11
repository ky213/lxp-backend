const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db'); 
const statementService = require('../xapi/statement.service');

module.exports = {
    getById,
    create,
    update
};
/*
stateId=resume&activityId=http%3A%2F%2F6knKUXs5R3S_course_id&agent=%7B%22objectType%22%3A%22Agent%22%2C%22mbox%22%3A%22mailto%3Anebojsa.pongracic%40gmail.com%22%2C%22name%22%3A%22Neboj%C5%A1a%20Pongra%C4%8Di%C4%87%22%7D&registration=306b969e-e7c0-46cf-aeb8-32be7bbf7a14", {
*/

async function getById(activityId, agent, stateId, registration) {
    console.log("Get activity state:", activityId, agent, stateId, registration)
    

    let agentObj = JSON.parse(agent)
    try {
        let model =  knex.select([
            'state'
        ])
        .from('activities_state')
            .where('activities_state.activity_id', activityId)
            .whereRaw(`activities_state.agent->>'mbox' = ?`, [agentObj.mbox])
            .andWhere('activities_state.state_id', stateId)
            .andWhere('activities_state.registration', registration);

        const state = await model.orderBy('generated', 'desc')
        .limit(1)
        .first();

        return state ? state.state : state;
    }
    catch(error){
        console.log("Error during getting activities state:", error)
        return null
    }
}

async function create(state, activityId, agent, stateId, registration) {
    console.log("Create activity state:", stateId  )
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
        
        let agentObj = JSON.parse(agent);
        let experiencesActivity = await statementService.getExperiencesForUser(registration,[agentObj.mbox]);
        
        if(experiencesActivity)
        {
            // insert records in DB 
        }
    })
    .catch(err => {
        console.log('Create state error:', err);
        throw err;
    });
}


async function update(state, activityId, agent, stateId, registration) {
    console.log("Update activity state:", state)
    /*
    await knex('activity_replies')
        .where('activity_reply_id', replyId)
        .andWhere('employee_id', user.employeeId)
        .transacting(t)
        .update({
            text: reply.text,
            modified_at: knex.fn.now(),
            modified_by: user.employeeId
        });

        try {
            await t.commit();
        }
        catch(error) {
            console.log("Error while updating your reply to activity: ", error)
            await t.rollback();
        }*/
    return knex.transaction(async function(t) {
        let record = {
            activity_id: activityId,
            state_id: stateId,
            agent: agent,
            state: state,
            registration: registration
        };

        const result = await knex.raw(
            `? ON CONFLICT (activity_id, state_id, agent, registration)
                    DO UPDATE SET
                    state = EXCLUDED.state
                  RETURNING *;`,
            [knex("activities_state").transacting(t).insert(record)],
          );

          /*
        await knex('activities_state')
        .transacting(t)
        .insert({
            activity_id: activityId,
            state_id: stateId,
            agent: agent,
            state: state,
            registration: registration
        });
        */

    })
    .catch(err => {
        console.log('Create statement error:', err);
        throw err;
    });
}


