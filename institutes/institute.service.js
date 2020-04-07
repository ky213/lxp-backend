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
    deleteInstitutes
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

async function create(institute, user) {
    return knex.transaction(async function(t) {

        console.log("Got create institute:", institute, user)
        const instituteId = await knex('institutes')
        .transacting(t)
        .insert({
            name: institute.name,
            logo: institute.logo,
            color_code: institute.colorCode,
            background_color_code: institute.backgroundColorCode,
            created_by: user.sub,
            modified_by: user.sub,
            is_active: institute.isActive
        }).returning('institute_id');


        await knex('activity_types')
        .transacting(t)
        .insert([
            {activity_type_id: 1, name: 'Half day', institute_id: instituteId[0] },
            {activity_type_id: 2, name: 'Clinical round', institute_id: instituteId[0] },
            {activity_type_id: 3, name: 'Inward patient supervision', institute_id: instituteId[0] },
            {activity_type_id: 4, name: 'Procedural activity', institute_id: instituteId[0] },
            {activity_type_id: 5, name: 'Case Presentation', institute_id: instituteId[0] },
            {activity_type_id: 6, name: 'Research study', institute_id: instituteId[0] },
            {activity_type_id: 7, name: 'Journal club', institute_id: instituteId[0] },
            {activity_type_id: 8, name: 'Publication', institute_id: instituteId[0] },
            {activity_type_id: 9, name: 'Case study', institute_id: instituteId[0] },
            {activity_type_id: 10, name: 'Conference attendance', institute_id: instituteId[0] },
            {activity_type_id: 11, name: 'Meeting', institute_id: instituteId[0] },
            {activity_type_id: 12, name: 'Read resource', institute_id: instituteId[0] },
          ]);
    })
    .catch(err => {
        console.log('Create institute error:', err);
        throw err;
    });
}

async function update(institute, user)
{
    console.log("Got update user:", user)
    return knex('institutes')
        .where('institute_id', institute.instituteId)
        .update({
            name: institute.name,
            logo: institute.logo,
            color_code: institute.colorCode,
            background_color_code: institute.backgroundColorCode,
            modified_at: knex.fn.now(),
            modified_by: user.sub,
            is_active: institute.isActive
        });
}

async function getByName(name, user) {
    return await knex.select([
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
        .whereRaw(`LOWER(institutes.name) = ?`, [`${name.toLowerCase().trim()}`])
        .limit(1)
        .first();
}

async function deleteInstitutes(institutes, user)
{
    console.log("Got delete institutes:", institutes, user)
    return knex('institutes')
        .whereIn('institute_id', institutes)
        .update({
            is_active: false
        });
}