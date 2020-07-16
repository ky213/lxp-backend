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

async function getAll(user, organizationId, pageId, recordsPerPage, filter) {
    //console.log("Get all activity_types:", user, pageId, recordsPerPage, filter)

    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table("activity_types")
        .join('organizations', 'organizations.organization_id', 'activity_types.organization_id');

    if(user.role == Role.SuperAdmin && organizationId) {
        model.andWhere('activity_types.organization_id', organizationId);
    }
    else {
        model.andWhere('activity_types.organization_id', user.organization);
    }

    if (filter) {
        model.whereRaw(`LOWER(activity_types.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    //console.log("Total rows:", totalNumberOfRecords)
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const activityTypes = await model.clone()
        .orderBy('activity_types.activity_type_id', 'desc')
        .limit(recordsPerPage || 15)
        .select([
            "activity_types.activity_type_id as activityTypeId",
            "activity_types.name",
            "activity_types.organization_id as organizationId",
            "organizations.name as organizationName"
        ]);

    //console.log("Got activityTypes:", activityTypes)
    return {
        activityTypes,
        totalNumberOfRecords: totalNumberOfRecords[0].count
    };
}

async function getById(id, user, organizationId) {
    //console.log("Got getById():", id)

    let model = knex.table("activity_types")
        .where('activity_types.activity_type_id', id);

    if(user.role == Role.SuperAdmin && organizationId) {
        model.andWhere('activity_types.organization_id', organizationId);
    }
    else {
        model.andWhere('activity_types.organization_id', user.organization);
    }    

    return await model.clone()
        .select(
            "activity_types.activity_type_id as activityTypeId",
            "activity_types.name"
        ).limit(1).first();
}

async function create(activityType) {
    //console.log("Got create activityType:", activityType)  
    const activityTypeId = await knex('activity_types').where('organization_id', activityType.organizationId)
        .max('activity_type_id')
        .first();

    await knex('activity_types')
        .insert({
            activity_type_id: activityTypeId.max + 1,
            name: activityType.name,
            organization_id: activityType.organizationId
        }).returning('activity_type_id');
}

async function update(activityType) {
    /*  console.log("Got update activityType:", activityType); */

    await knex('activity_types')
        .where('activity_type_id', activityType.activityTypeId)
        .andWhere('organization_id', activityType.organizationId)
        .update({
            name: activityType.name
        });
}



