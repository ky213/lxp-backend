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

async function getAll(user, instituteId, pageId, recordsPerPage, filter) {
    //console.log("Get all activity_types:", user, pageId, recordsPerPage, filter)

    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table("activity_types")
        .join('institutes', 'institutes.institute_id', 'activity_types.institute_id');

    if(user.role == Role.SuperAdmin && instituteId) {
        model.andWhere('activity_types.institute_id', instituteId);
    }
    else {
        model.andWhere('activity_types.institute_id', user.institute);
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
            "activity_types.institute_id as instituteId",
            "institutes.name as instituteName"
        ]);

    //console.log("Got activityTypes:", activityTypes)
    return {
        activityTypes,
        totalNumberOfRecords: totalNumberOfRecords[0].count
    };
}

async function getById(id, user, instituteId) {
    //console.log("Got getById():", id)

    let model = knex.table("activity_types")
        .where('activity_types.activity_type_id', id);

    if(user.role == Role.SuperAdmin && instituteId) {
        model.andWhere('activity_types.institute_id', instituteId);
    }
    else {
        model.andWhere('activity_types.institute_id', user.institute);
    }    

    return await model.clone()
        .select(
            "activity_types.activity_type_id as activityTypeId",
            "activity_types.name"
        ).limit(1).first();
}

async function create(activityType) {
    //console.log("Got create activityType:", activityType)  
    const activityTypeId = await knex('activity_types').where('institute_id', activityType.instituteId)
        .max('activity_type_id')
        .first();

    await knex('activity_types')
        .insert({
            activity_type_id: activityTypeId.max + 1,
            name: activityType.name,
            institute_id: activityType.instituteId
        }).returning('activity_type_id');
}

async function update(activityType) {
    /*  console.log("Got update activityType:", activityType); */

    await knex('activity_types')
        .where('activity_type_id', activityType.activityTypeId)
        .andWhere('institute_id', activityType.instituteId)
        .update({
            name: activityType.name
        });
}



