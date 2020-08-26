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
    deleteOrganizations
};

async function getAll(user, pageId, recordsPerPage, filter) {
    //console.log("Get all organizations:", user, pageId, recordsPerPage, filter)
    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table('organizations');

    if (filter) {
        model.whereRaw(`LOWER(organizations.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    //console.log("Total rows:", totalNumberOfRecords)
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const organizations = await model.clone()        
        .orderBy('organizations.is_active', 'desc')
        .orderBy('organizations.created_at', 'desc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'organizations.organization_id as organizationId', 
            'organizations.name', 
            'organizations.logo',
            'organizations.color_code as colorCode',       
            'organizations.background_color_code as backgroundColorCode',        
            'organizations.created_at as createdAt',
            'organizations.created_by as createdBy',
            'organizations.modified_at as modifiedAt',
            'organizations.modified_by as modifiedBy',
            'organizations.is_active as isActive',
            'organizations.default_group_id as defaultGroupId'
        ]);

    //console.log("Got organizations:", organizations)
    return { organizations, totalNumberOfRecords: totalNumberOfRecords[0].count };
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
        'organizations.is_active as isActive',
        'organizations.default_group_id as defaultGroupId'
    ])
    .from('organizations')
        .where('organizations.organization_id', id)
        .limit(1)
        .first()
    .then(function(output){
        return output;
    });
}

async function create(organization, user) {
    return knex.transaction(async function(t) {

        console.log("Got create organization:", organization, user)
        const organizationId = await knex('organizations')
        .transacting(t)
        .insert({
            name: organization.name,
            logo: organization.logo,
            color_code: organization.colorCode,
            background_color_code: organization.backgroundColorCode,
            created_by: user.sub,
            modified_by: user.sub,
            is_active: organization.isActive,
            default_group_id:  organization.defaultGroupId
        }).returning('organization_id');
        
        await knex('programs')
        .transacting(t)
        .insert({
                name: 'Default Program',
                organization_id: organizationId[0],
                created_by: user.sub,
                modified_by: user.sub,
                block_type_id: 3
            }).returning('program_id'); 
            
        await knex('activity_types')
        .transacting(t)
        .insert([
            {activity_type_id: 1, name: 'Half day', organization_id: organizationId[0] },
            {activity_type_id: 2, name: 'Clinical round', organization_id: organizationId[0] },
            {activity_type_id: 3, name: 'Inward patient supervision', organization_id: organizationId[0] },
            {activity_type_id: 4, name: 'Procedural activity', organization_id: organizationId[0] },
            {activity_type_id: 5, name: 'Case Presentation', organization_id: organizationId[0] },
            {activity_type_id: 6, name: 'Research study', organization_id: organizationId[0] },
            {activity_type_id: 7, name: 'Journal club', organization_id: organizationId[0] },
            {activity_type_id: 8, name: 'Publication', organization_id: organizationId[0] },
            {activity_type_id: 9, name: 'Case study', organization_id: organizationId[0] },
            {activity_type_id: 10, name: 'Conference attendance', organization_id: organizationId[0] },
            {activity_type_id: 11, name: 'Meeting', organization_id: organizationId[0] },
            {activity_type_id: 12, name: 'Read resource', organization_id: organizationId[0] },
          ]);
    })
    .catch(err => {
        console.log('Create organization error:', err);
        throw err;
    });
}

async function update(organization, user)
{
    console.log("Got update user:", user)
    return knex('organizations')
        .where('organization_id', organization.organizationId)
        .update({
            name: organization.name,
            logo: organization.logo,
            color_code: organization.colorCode,
            background_color_code: organization.backgroundColorCode,
            modified_at: knex.fn.now(),
            modified_by: user.sub,
            is_active: organization.isActive,
            default_group_id:  organization.defaultGroupId
        });
}

async function getByName(name, user) {
    return await knex.select([
        'organizations.organization_id as organizationId', 
        'organizations.name', 
        'organizations.logo',
        'organizations.color_code as colorCode',       
        'organizations.background_color_code as backgroundColorCode', 
        'organizations.created_at as createdAt',
        'organizations.created_by as createdBy',
        'organizations.modified_at as modifiedAt',
        'organizations.modified_by as modifiedBy',
        'organizations.is_active as isActive',
        'organizations.default_group_id as defaultGroupId'
    ])
    .from('organizations')
        .whereRaw(`LOWER(organizations.name) = ?`, [`${name.toLowerCase().trim()}`])
        .limit(1)
        .first();
}

async function deleteOrganizations(organizations, user)
{
    console.log("Got delete organizations:", organizations, user)
    return knex('organizations')
        .whereIn('organization_id', organizations)
        .update({
            is_active: false
        });
}