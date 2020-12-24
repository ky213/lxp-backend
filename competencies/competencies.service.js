const Role = require('helpers/role');
const knex = require('../db'); 

module.exports = {
    getAll,
    getById,
    create,
    update,
    getByCode,
    deleteCompetencies
};

async function getAll(user, organizationId, pageId, recordsPerPage, filter) {

    if (!recordsPerPage)
    recordsPerPage = 10;

    if (!pageId)
    pageId = 1;

    let offset = ((pageId || 1) - 1) * recordsPerPage;
 
    let model = knex.table('competencies')
    .join('organizations', 'organizations.organization_id', 'competencies.organization_id')
    .join('competency_type', 'competency_type.competency_type_id', 'competencies.competency_type_id');

    if(user.role == Role.SuperAdmin && organizationId) {
        model.andWhere('competencies.organization_id', organizationId);
    }
    else {
        model.andWhere('competencies.organization_id', user.organization);
    }

    if (filter) {
        model.whereRaw(`LOWER(competencies.title) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const competencies = await model.clone()        
        .orderBy('competencies.created_at', 'desc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'competencies.competency_id as competencyId', 
            'competencies.code', 
            'competencies.title', 
            'competencies.description',
            'competencies.time_expected as timeExpected',
            'competencies.competency_type_id',
            'competency_type.name as competencyTypeName',
            'competency_type.level as competencyTypeLevel',
            'competencies.organization_id as organizationId', 
            'organizations.name as organizationName',
            'competencies.created_at as createdAt',
            'competencies.created_by as createdBy',
            'competencies.modified_at as modifiedAt',
            'competencies.modified_by as modifiedBy'
        ]);


    return { competencies, totalNumberOfRecords: totalNumberOfRecords[0].count };
}

async function getById(competencyId , selectedOrganizationId) {
    return knex.select([
        'competencies.competency_id as competencyId', 
        'competencies.code', 
        'competencies.title', 
        'competencies.description',
        'competencies.time_expected as timeExpected',
        'competencies.competency_type_id',
        'competency_type.name as competencyTypeName',
        'competency_type.level as competencyTypeLevel',
        'competencies.organization_id as organizationId', 
        'competencies.created_at as createdAt',
        'competencies.created_by as createdBy',
        'competencies.modified_at as modifiedAt',
        'competencies.modified_by as modifiedBy'
    ])
    .from('competencies')
    .join('competency_type', 'competency_type.competency_type_id', 'competencies.competency_type_id')
    .where('competencies.competency_id', competencyId)
    .andWhere('competencies.organization_id', selectedOrganizationId )
    .limit(1)
    .first()
    .then(function(output){
        return output;
    });
}

async function create(competency, user) {
    return knex.transaction(async function(t) {
        const competencyId = await knex('competencies')
        .transacting(t)
        .insert({
            code: competency.code,
            title: competency.title,
            competency_type_id: competency.competencyTypeId,
            time_expected: competency.timeExpected,
            description: competency.description,
            organization_id: competency.organizationId,
            created_by: user.sub,
            modified_by: user.sub,
        }).returning('competency_id');
        
        return {...competency, competencyId};
    })
    .catch(error => { 
        if (error && error.code == '23505')
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Code already taken, it should be unique' })) 
        else
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
    });
}

async function update(competency, user)
{
    return knex('competencies')
        .where('competency_id', competency.competencyId)
        .update({
            code: competency.code,
            title: competency.title,
            competency_type_id: competency.competencyTypeId,
            time_expected: competency.timeExpected,
            description: competency.description,
            modified_at: knex.fn.now(),
            modified_by: user.sub
        })
        .catch(error => { 
            if (error && error.code == '23505')
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Code already taken, it should be unique' })) 
            else
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });
}

async function getByCode(name, user) {
    return await knex.select([
        'competencies.competency_id as competencyId', 
        'competencies.code', 
        'competencies.title', 
        'competencies.description',
        'competencies.competency_type_id',    
        'competencies.organization_id as organizationId', 
        'competencies.created_at as createdAt',
        'competencies.created_by as createdBy',
        'competencies.modified_at as modifiedAt',
        'competencies.modified_by as modifiedBy'
    ])
    .from('competencies')
    .whereRaw(`LOWER(competencies.code) = ?`, [`${name.toLowerCase().trim()}`])
    .limit(1)
    .first();
}

async function deleteCompetencies(competencies, user)
{
    let competencyTagCount = await knex('competencies_tags')
    .whereIn('competency_id', competencies)
    .count();    
  
    let competencyExists = competencyTagCount[0].count > 0;

    if (!competencyExists){
        return knex('competencies')
            .whereIn('competency_id', competencies)
            .del()
            .catch(error => {
                let errorObj = {isValid: false, status: "error", code: error.code, message :  error.message};
                throw new Error(JSON.stringify(errorObj));
            });
    }
    else
    {
        let errorObj = {isValid: false, status: "error", code: 1, message :  'Foreign key constraint'};
        throw new Error(JSON.stringify(errorObj));
    }
}
