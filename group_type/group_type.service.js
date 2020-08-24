const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    deletegrouptypes
};

async function getAll(user, organizationId, pageId, recordsPerPage, filter) {

    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table("group_types")
    .join('organizations', 'organizations.organization_id', 'group_types.organization_id');

    if(user.role == Role.SuperAdmin && organizationId) {
        model.andWhere('group_types.organization_id', organizationId);
    }
    else {
        model.andWhere('group_types.organization_id', user.organization);
    }

    if (filter) {
        model.whereRaw(`LOWER(group_types.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const groupTypes = await model.clone()
        .orderBy('group_types.group_type_id', 'desc')
        .limit(recordsPerPage || 15)
        .select([
            "group_types.group_type_id as groupTypeId",
            "group_types.name",
            "group_types.organization_id as organizationId",
            "organizations.name as organizationName"
        ]);

    return {
        groupTypes,
        totalNumberOfRecords: totalNumberOfRecords[0].count
    };
}

async function getById(groupTypeId) {
    return await knex
    .table("group_types")
    .where("group_types.group_type_id", groupTypeId)
    .select([
      "group_types.group_type_id as groupTypeId",
      "group_types.name"
    ]);
}

async function create(groupType) {
 
    await knex('group_types')
        .insert({
            name: groupType.name,
            organization_id: groupType.organizationId
        }).returning('group_type_id');
}

async function update(groupType) {
    return await knex('group_types')
        .where('group_type_id', groupType.groupTypeId)
        .andWhere('organization_id', groupType.organizationId)
        .update({
            name: groupType.name
        });
}

async function deletegrouptypes(groupTypes)
{
    return knex('group_types')
        .whereIn('group_type_id', groupTypes)
        .del();
}



