const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    deleteActivityTypes
};

async function getAll(user, organizationId, pageId, recordsPerPage, filter) {

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

    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const activityTypes = await model.clone()
        .orderBy('activity_types.activity_type_id', 'desc')
        .offset(offset)
        .limit(recordsPerPage || 15)
        .select([
            "activity_types.activity_type_id as activityTypeId",
            "activity_types.name",
            "activity_types.organization_id as organizationId",
            "organizations.name as organizationName"
        ]);

    const allActivityTypeCompetencies = await knex.table('competencies_tags')
        .leftJoin('activity_types', 'competencies_tags.activity_type_id' , 'activity_types.activity_type_id')
        .leftJoin('competencies', 'competencies_tags.competency_id' , 'competencies.competency_id')
        .whereIn('activity_types.activity_type_id', activityTypes.map(c => c.activityTypeId))
        .andWhere('activity_types.organization_id', user.role == Role.SuperAdmin && organizationId || user.organization)
        .select([
            'activity_types.activity_type_id as activityTypeId',
            'competencies.competency_id as competencyId',
            'competencies.code as competencyCode', 
            'competencies.title as competencyTitle', 
        ]);  
        
        return {
            activityTypes: activityTypes.map(activityType => {
                return {
                    ...activityType,
                    competencyIds: allActivityTypeCompetencies.filter(c => c.activityTypeId == activityType.activityTypeId).map(d => {
                        return {
                            competencyId: d.competencyId,
                            competencyCode: d.competencyCode,
                            competencyTitle: d.competencyTitle
                        }
                    }),
                }
            }),     
            totalNumberOfRecords: totalNumberOfRecords[0].count
        };     
}

async function getById(activityTypeId, user, organizationId) {

    let selectActivity = knex.select([
        "activity_types.activity_type_id as activityTypeId",
        "activity_types.name"
    ])
    .from('activity_types')

    let activityData = await selectActivity    
    .where('activity_types.activity_type_id', activityTypeId)
    .andWhere('activity_types.organization_id', user.role == Role.SuperAdmin && organizationId ? organizationId : user.organization)
    .limit(1)
    .first();
   
    if(activityData) {
        const competencies = await knex.table('competencies_tags')
            .leftJoin('activity_types', 'competencies_tags.activity_type_id' , 'activity_types.activity_type_id')
            .leftJoin('competencies', 'competencies_tags.competency_id' , 'competencies.competency_id')
            .andWhere('activity_types.activity_type_id', activityTypeId)
            .andWhere('activity_types.organization_id', user.role == Role.SuperAdmin && organizationId || user.organization)
            .select([
                'competencies.competency_id as competencyId',
                'competencies.code as competencyCode', 
                'competencies.title as competencyTitle', 
             ]);

        activityData.competencyIds = competencies.map(d => ({
            competencyId: d.competencyId,
            competencyCode: d.competencyCode,
            competencyTitle: d.competencyTitle
        }));     
    }

    return activityData

}

async function create(activityType) {

    return knex.transaction(async function (t) {
        const activityTypeId = await knex('activity_types').where('organization_id', activityType.organizationId)
        .max('activity_type_id')
        .first();

        const activityTypeIdInserted =await knex('activity_types')
        .insert({
            activity_type_id: activityTypeId.max + 1,
            name: activityType.name,
            organization_id: activityType.organizationId
        }).returning('activity_type_id')
        .catch(error => { 
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        }); 

        if (activityType.competencyIds) {
            const insertCompetencyIds = activityType.competencyIds.map(competency => {
                return {
                    activity_type_id: activityTypeIdInserted[0],
                    organization_id : activityType.organizationId,
                    competency_id: competency.competencyId
                }
            });
    
            await knex('competencies_tags').where('activity_type_id', activityTypeIdInserted[0]).del().catch(error => console.log(error));
            await knex('competencies_tags')
            .insert(insertCompetencyIds)
            .catch(error => { 
                if (error && error.code == '23505')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each activity type' })) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
        }

    }); 
}

async function update(activityType) {
    return knex.transaction(async function (t) {
        await knex('activity_types')
        .where('activity_type_id', activityType.activityTypeId)
        .andWhere('organization_id', activityType.organizationId)
        .update({
            name: activityType.name
        })
        .catch(error => { 
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        }); 

        if (activityType.competencyIds) {
            const insertCompetencyIds = activityType.competencyIds.map(competency => {
                return {
                    activity_type_id: activityType.activityTypeId,
                    organization_id : activityType.organizationId,
                    competency_id: competency.competencyId
                }
            });
    
            await knex('competencies_tags').where('activity_type_id', activityType.activityTypeId).del().catch(error => console.log(error));
            await knex('competencies_tags')
            .insert(insertCompetencyIds)
            .catch(error => { 
                if (error && error.code == '23505')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each activity type' })) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
        }

    }); 
}

async function deleteActivityTypes(ids, user) {
    await knex('activity_types')
        .whereIn('activity_type_id', ids)
        .del();
}

