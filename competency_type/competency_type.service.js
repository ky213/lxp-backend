const Role = require('helpers/role');
const knex = require('../db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    deleteCompetencyType
};

async function getAll(user, organizationId, pageId, recordsPerPage, filter) {

    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table("competency_type")
    .join('organizations', 'organizations.organization_id', 'competency_type.organization_id');

    if(user.role == Role.SuperAdmin && organizationId) {
        model.andWhere('competency_type.organization_id', organizationId);
    }
    else {
        model.andWhere('competency_type.organization_id', user.organization);
    }

    if (filter) {
        model.whereRaw(`LOWER(competency_type.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const competencyTypes = await model.clone()
        .orderBy('competency_type.competency_type_id', 'desc')
        .limit(recordsPerPage || 15)
        .select([
            "competency_type.competency_type_id as competencyTypeId",
            "competency_type.name",
            "competency_type.level",
            "competency_type.organization_id as organizationId",
            'competency_type.created_at as createdAt',
            'competency_type.created_by as createdBy',
            'competency_type.modified_at as modifiedAt',
            'competency_type.modified_by as modifiedBy',
            "organizations.name as organizationName"
        ]);

    return {
        competencyTypes,
        totalNumberOfRecords: totalNumberOfRecords[0].count
    };
}

async function getById(competencyTypeId , selectedOrganizationId) {
    return await knex
    .table("competency_type")
    .where("competency_type.competency_type_id", competencyTypeId)
    .andWhere('competency_type.organization_id', selectedOrganizationId )
    .select([
      "competency_type.competency_type_id as competencyTypeId",
      "competency_type.name",
      "competency_type.level",
      'competency_type.created_at as createdAt',
      'competency_type.created_by as createdBy',
      'competency_type.modified_at as modifiedAt',
      'competency_type.modified_by as modifiedBy'
    ]);
}

async function create(user, competencyType) {
    
    const competencyTypeId = await knex('competency_type')
        .insert({
            name: competencyType.name,
            level: competencyType.level,
            organization_id: competencyType.organizationId,
            created_by: user.sub,
            modified_by: user.sub
        }).returning('competency_type_id')
        .catch(error => { 
            if (error && error.code == '23505')
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Type Name already taken, it should be unique' })) 
            else
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });
    
    return {...competencyType, competencyTypeId};    
}

async function update(user, competencyType) {
    return await knex('competency_type')
        .where('competency_type_id', competencyType.competencyTypeId)
        .andWhere('organization_id', competencyType.organizationId)
        .update({
            name: competencyType.name,
            level: competencyType.level,
            modified_at: knex.fn.now(),
            modified_by: user.sub
        })
        .catch(error => { 
            if (error && error.code == '23505')
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Type Name already taken, it should be unique' })) 
            else
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });
}

async function deleteCompetencyType(competencyTypes)
{
    return knex('competency_type')
        .whereIn('competency_type_id', competencyTypes)
        .del()
        .catch(error => {
            let errorObj = {isValid: false, status: "error", code: error.code, message :  error.message};
            throw new Error(JSON.stringify(errorObj));
          });
}



