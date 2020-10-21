const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db'); 

module.exports = {
    getAll,
    getById,
    create,
    update,
    getByName,
    deleteGroups,
    getAllGroupsIds
};

async function getAllGroupsIds(user, organizationId) {


    let model = knex.table('groups')
        .join('organizations', 'organizations.organization_id', 'groups.organization_id')
        .join('group_types', 'group_types.group_type_id', 'groups.group_type_id');


    const groups = await model.clone()
        .orderBy('groups.name', 'asc')
        .select([
            'groups.group_id as groupId',
            'groups.name',
        ]);


    return groups;
}

async function getAll(user, organizationId, pageId, recordsPerPage, filter) {

    if (!recordsPerPage)
    recordsPerPage = 10;

    if (!pageId)
    pageId = 1;

    let offset = ((pageId || 1) - 1) * recordsPerPage;
 
    let model = knex.table('groups')
    .join('organizations', 'organizations.organization_id', 'groups.organization_id')
    .join('group_types', 'group_types.group_type_id', 'groups.group_type_id');

    if(user.role == Role.SuperAdmin && organizationId) {
        model.andWhere('groups.organization_id', organizationId);
    }
    else {
        model.andWhere('groups.organization_id', user.organization);
    }

    if (filter) {
        model.whereRaw(`LOWER(groups.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const groups = await model.clone()        
        .orderBy('groups.is_active', 'desc')
        .orderBy('groups.created_at', 'desc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'groups.group_id as groupId', 
            'groups.name', 
            'groups.description',
            'groups.group_type_id',
            'groups.organization_id as organizationId', 
            'groups.created_at as createdAt',
            'groups.created_by as createdBy',
            'groups.modified_at as modifiedAt',
            'groups.modified_by as modifiedBy',
            'groups.is_active as isActive',
            'organizations.name as organizationName',
            'group_types.name as groupTypesName',
        ]);


    return { groups, totalNumberOfRecords: totalNumberOfRecords[0].count };
}

async function getById(groupId) {
    return knex.select([
        'groups.group_id as groupId', 
        'groups.name', 
        'groups.description',
        'groups.group_type_id',
        'groups.organization_id as organizationId', 
        'groups.created_at as createdAt',
        'groups.created_at as createdAt',
        'groups.created_by as createdBy',
        'groups.modified_at as modifiedAt',
        'groups.modified_by as modifiedBy',
        'groups.is_active as isActive'
    ])
    .from('groups')
        .where('groups.group_id', groupId)
        .limit(1)
        .first()
    .then(function(output){
        return output;
    });
}

async function create(group, user) {
    return knex.transaction(async function(t) {

        console.log("Got create group:", group, user)
        const groupId = await knex('groups')
        .transacting(t)
        .insert({
            name: group.name,
            group_type_id: group.typeId,
            description: group.description,
            organization_id: group.organizationId,
            created_by: user.sub,
            modified_by: user.sub,
            is_active: group.isActive
        }).returning('group_id');       
    })
    .catch(err => {
        console.log('Create group error:', err);
        throw err;
    });
}

async function update(group, user)
{
    console.log("Got update user:", user)
    return knex('groups')
        .where('group_id', group.groupId)
        .update({
            name: group.name,
            group_type_id: group.typeId,
            description: group.description,
            organization_id: group.organizationId,
            modified_at: knex.fn.now(),
            modified_by: user.sub,
            is_active: group.isActive
        });
}

async function getByName(name, user) {
    return await knex.select([
        'groups.group_id as groupId', 
        'groups.name', 
        'groups.description',
        'groups.group_type_id',    
        'groups.organization_id as organizationId', 
        'groups.created_at as createdAt',
        'groups.created_by as createdBy',
        'groups.modified_at as modifiedAt',
        'groups.modified_by as modifiedBy',
        'groups.is_active as isActive'
    ])
    .from('groups')
        .whereRaw(`LOWER(groups.name) = ?`, [`${name.toLowerCase().trim()}`])
        .limit(1)
        .first();
}

async function deleteGroups(groups, user)
{
    let groupEmployeeCount = await knex('groups_employee')
    .whereIn('group_id', groups)
    .count();    
  
    let groupExists = groupEmployeeCount[0].count > 0;

    if (!groupExists){
        return knex('groups')
            .whereIn('group_id', groups)
            .update({
                is_active: false
            });
    }
    else
    {
        let errorObj = {isValid: false, status: "error", code: 1, message :  'Foreign key constraint'};
        throw new Error(JSON.stringify(errorObj));
    }
}
