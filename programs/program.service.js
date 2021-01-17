const Role = require('helpers/role');
const knex = require('../db');
const academicYearService = require("../academic_years/academic_year.service");

module.exports = {
    getAll,
    getAllV2,
    getById,
    getByCurrentUser,
    create,
    update,
    getBlockTypes,
    getProgramIdByProgramName,
    deletePrograms,
    deleteAllInactive,
    getDefaultProgram
};

async function getAll(user, organizationId, pageId, recordsPerPage, filter) {
    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table('programs');

    if (user.role == Role.ProgramDirector) {
        model.join('program_directors', 'program_directors.program_id', 'programs.program_id')
            .join('employees', 'employees.employee_id', 'program_directors.employee_id')
            .where('employees.employee_id', user.employeeId);
    }    

    if (user.role != Role.SuperAdmin) {
        model.where('programs.organization_id', user.organization);
    }
    else {
        if(organizationId) {
            model.where('programs.organization_id', organizationId);
        }
    }

    model.andWhere('programs.is_active', true);

    if (filter) {
        model.whereRaw(`LOWER(programs.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }
    
    const totalNumberOfRecords = await model.clone().count();
    //console.log("Total rows:", totalNumberOfRecords)
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const programs = await model.clone()
    .orderBy('programs.is_active', 'desc')
    .orderBy('programs.created_at', 'desc')
    .offset(offset)
    .limit(recordsPerPage || 15)
    .select([
        'programs.program_id as programId',
        'programs.name',
        'programs.organization_id as organizationId',
        'programs.description',
        'programs.duty_time_from as dutyTimeFrom',
        'programs.duty_time_to as dutyTimeTo',
        'programs.allowed_annual_vacation_weeks as allowedAnnualVacationWeeks',
        'programs.allowed_educational_leave_days as allowedEducationalLeaveDays',
        'programs.allowed_emergency_leave_days as allowedEmergencyLeaveDays',
        'programs.total_block_junior as totalBlockJunior',
        'programs.total_block_senior as totalBlockSenior',
        'programs.block_type_id as blockTypeId',
        'programs.min_experience_level as minExperienceLevel',
        'programs.max_experience_level as maxExperienceLevel',
        'programs.senior_learners_start_level as seniorLearnersStartLevel',
        'programs.is_active as isActive',
        'programs.subject ',
        'programs.body ',
        'programs.certifcate_subject as certificateSubject',
        'programs.certifcate_body as certificateBody '
    ]);

    const allProgramDirectors =
        await knex.table('program_directors')
            .join('programs', 'programs.program_id', 'program_directors.program_id')
            .join('employees', 'employees.employee_id', 'program_directors.employee_id')
            .join('users', 'users.user_id', 'employees.user_id')
            //.where('programs.is_active', true)
            .whereIn('programs.program_id', programs.map(p => p.programId))
            .select([
                'employees.employee_id as employeeId',
                'program_directors.program_id as programId',
                'users.name',
                'users.surname',
            ]);                               

    return {
        programs: programs.map(prog => {
            return {
                ...prog,
                programDirectors: allProgramDirectors.filter(p => p.programId == prog.programId).map(d => {
                    return {
                        name: `${d.name} ${d.surname}`,
                        employeeId: d.employeeId
                    }
                })
            }
        }), 
        totalNumberOfRecords: totalNumberOfRecords[0].count
    };  
}

async function getAllV2(user, organizationId, pageId, recordsPerPage, filter , byName) {    
    let loggedUserId = user.employeeId || user.sub;
    let offset = ((pageId || 1) - 1) * recordsPerPage;
    let model = knex.table('programs');

    let canDoAll = false;
    let canViewOnly = false;

    if(user.role == Role.CourseManager || user.role == Role.Learner) {
        canViewOnly = true;
    }
    else if(user.role == Role.Admin || user.role ==  Role.SuperAdmin || user.role == Role.LearningManager) {
        canDoAll = true;
        canEdit = true;
    } 

    if (user.role != Role.SuperAdmin) {
        model.where('programs.organization_id', user.organization);
    }
    else {
        if(organizationId) {
            model.where('programs.organization_id', organizationId);
        }
    }

    model.andWhere('programs.is_active', true);

    if (filter) {
        model.whereRaw(`LOWER(programs.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const programs = await model.clone()
    .orderBy('programs.is_active', 'desc')
    .orderBy('programs.created_at', 'desc')
    .offset(offset)
    .limit(recordsPerPage || 15)
    .select([
        'programs.program_id as programId',
        'programs.name',
        'programs.organization_id as organizationId',
        'programs.description',
        'programs.duty_time_from as dutyTimeFrom',
        'programs.duty_time_to as dutyTimeTo',
        'programs.allowed_annual_vacation_weeks as allowedAnnualVacationWeeks',
        'programs.allowed_educational_leave_days as allowedEducationalLeaveDays',
        'programs.allowed_emergency_leave_days as allowedEmergencyLeaveDays',
        'programs.total_block_junior as totalBlockJunior',
        'programs.total_block_senior as totalBlockSenior',
        'programs.block_type_id as blockTypeId',
        'programs.min_experience_level as minExperienceLevel',
        'programs.max_experience_level as maxExperienceLevel',
        'programs.senior_learners_start_level as seniorLearnersStartLevel',
        'programs.is_active as isActive',
        'programs.subject ',
        'programs.body ',
        'programs.certifcate_subject as certificateSubject',
        'programs.certifcate_body as certificateBody '
    ]);

    let modelDirecotrs = knex.table('program_directors')
    .join('programs', 'programs.program_id', 'program_directors.program_id')
    .join('employees', 'employees.employee_id', 'program_directors.employee_id')
    .join('users', 'users.user_id', 'employees.user_id')
    .whereIn('programs.program_id', programs.map(p => p.programId))

    if(byName){
        modelDirecotrs.whereRaw(`LOWER(users.name) LIKE ?`, [`%${byName.toLowerCase().trim()}%`])
        modelDirecotrs.orWhereRaw(`LOWER(users.surname) LIKE ?`, [`%${byName.toLowerCase().trim()}%`])
    }

    const allProgramDirectors = await modelDirecotrs.clone()
        .select([
            'employees.employee_id as employeeId',
            'program_directors.program_id as programId',
            'users.name',
            'users.surname',
            'users.user_id as userId'
        ]);                               

    let data = {
        programs: programs.map(prog => {
            return {
                ...prog,
                programDirectors: allProgramDirectors.filter(p => p.programId == prog.programId)
                .map(d => {
                    return {
                        name:`${d.name} ${d.surname}`,
                        employeeId: d.employeeId,
                        userId : d.userId                        
                    }
                }) ,
                canEdit : allProgramDirectors.filter(p => p.programId == prog.programId).map(d => {
                    return  (user.role == Role.ProgramDirector ) && (d.employeeId || d.userId ) == loggedUserId ? true : false ;
                })               
            }
        }), 
        canDoAll : canDoAll,
        canViewOnly : canViewOnly
    };  

    data.programs = data && programs ? data.programs.filter(d => d.programDirectors && d.programDirectors.length > 0 ) : data.programs;

    return {...data , totalNumberOfRecords : data ? data.programs.length : 0 };

}

async function getById(id, user, selectedorganizationId) {
    let select = knex.select([
        'programs.program_id as programId',
        'programs.name',
        'programs.organization_id as organizationId',
        'programs.description',
        'programs.duty_time_from as dutyTimeFrom',
        'programs.duty_time_to as dutyTimeTo',
        'programs.allowed_annual_vacation_weeks as allowedAnnualVacationWeeks',
        'programs.allowed_educational_leave_days as allowedEducationalLeaveDays',
        'programs.allowed_emergency_leave_days as allowedEmergencyLeaveDays',
        'programs.total_block_junior as totalBlockJunior',
        'programs.total_block_senior as totalBlockSenior',
        'programs.block_type_id as blockTypeId',
        'programs.min_experience_level as minExperienceLevel',
        'programs.max_experience_level as maxExperienceLevel',
        'programs.senior_learners_start_level as seniorLearnersStartLevel',
        'programs.subject ',
        'programs.body ',
        'programs.certifcate_subject as certificateSubject',
        'programs.certifcate_body as certificateBody '
    ])
    .from('programs');

    if (user.role == Role.SuperAdmin && selectedorganizationId) {
        select.where('programs.organization_id', selectedorganizationId);
    }
    else {
        select.where('programs.organization_id', user.organization);
    }

    let program = await select
        .where('programs.program_id', id)
        .limit(1)
        .first();

    if(program) {
        program.totalLearners = 0;
            
        try {
            const totalLearnersCount = await knex('employee_programs').where('program_id', id).count();
            if(totalLearnersCount && totalLearnersCount.length > 0) {
                program.totalLearners = totalLearnersCount[0].count;
            }
        }
        catch(error) {
            console.log("Error while getting total count of learners for program:", error)
        }

        const directors = await knex.table('program_directors')
        .join('employees', 'employees.employee_id', 'program_directors.employee_id')
        .join('users', 'users.user_id', 'employees.user_id')
        .andWhere('program_directors.program_id', id)
        .select([
            'employees.employee_id as employeeId',
            'program_directors.program_id as programId',
            'users.name',
            'users.surname',
        ]);

        program.programDirectors = directors.map(d => ({
            name: `${d.name} ${d.surname}`,
            employeeId: d.employeeId
        }));
    }

    return program;
}

async function getDefaultProgram(user, selectedorganizationId) {

    let select = knex.select([
        'programs.program_id as programId',
        'programs.name',
        'programs.organization_id as organizationId',
        'programs.description',
        'programs.duty_time_from as dutyTimeFrom',
        'programs.duty_time_to as dutyTimeTo',
        'programs.allowed_annual_vacation_weeks as allowedAnnualVacationWeeks',
        'programs.allowed_educational_leave_days as allowedEducationalLeaveDays',
        'programs.allowed_emergency_leave_days as allowedEmergencyLeaveDays',
        'programs.total_block_junior as totalBlockJunior',
        'programs.total_block_senior as totalBlockSenior',
        'programs.block_type_id as blockTypeId',
        'programs.min_experience_level as minExperienceLevel',
        'programs.max_experience_level as maxExperienceLevel',
        'programs.senior_learners_start_level as seniorLearnersStartLevel',
        'programs.subject ',
        'programs.body ',
        'programs.certifcate_subject as certificateSubject',
        'programs.certifcate_body as certificateBody '
    ])
    .from('programs');

    if (user.role == Role.SuperAdmin && selectedorganizationId) {
        select.where('programs.organization_id', selectedorganizationId);
    }
    else {
        select.where('programs.organization_id', user.organization);
    }

    let program = await select
        .where('is_default', true)
        .limit(1)
        .first();

    return program;
}

async function create(program, user) {
    console.log("Got create program:", program, user)
    let blockType = null;
    if (!program.blockTypeId) {
        blockType = await knex('program_block_types')
            .where('description', 'Four weeks')
            .select('block_type_id')
            .first();
    }

    const programId =
        await knex('programs')
            .insert({
                name: program.name,
                organization_id: program.organizationId,
                created_by: user.employeeId || user.sub,
                modified_by: user.employeeId || user.sub,
                block_type_id: program.blockTypeId || blockType.block_type_id,
                subject: program.subject,
                body: program.body,
                certifcate_subject: program.certificateSubject,
                certifcate_body:  program.certificateBody
            })
            .returning('program_id')
            .catch(error => { 
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });

    const insertProgramDirectors = program.programDirectors.map(pd => {
        return {
            program_id: programId[0],
            employee_id: pd.employeeId
        }
    });

    await knex('program_directors')
        .insert(insertProgramDirectors)
        .catch(error => { 
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });
}

async function update(program, user) {
    await knex('programs')
        .where('program_id', program.programId)
        .update({
            name: program.name,
            description: program.description,
            duty_time_from: program.timeFrom,
            duty_time_to: program.timeTo,
            allowed_annual_vacation_weeks: program.allowedAnnualVacationWeeks,
            allowed_educational_leave_days: program.allowedEducationalLeaveDays,
            allowed_emergency_leave_days: program.allowedEmergencyLeaveDays,
            total_block_junior: program.totalBlockJunior,
            total_block_senior: program.totalBlockSenior,
            block_type_id: program.blockTypeId,
            min_experience_level: program.minExperienceLevel,
            max_experience_level: program.maxExperienceLevel,
            senior_learners_start_level: program.seniorLearnersStartLevel,
            subject: program.subject,
            body: program.body,
            certifcate_subject: program.certificateSubject,
            certifcate_body:  program.certificateBody
        })
        .catch(error => { 
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });

    if (program.programDirectors) {
        const insertProgramDirectors = program.programDirectors.map(pd => {
            return {
                program_id: program.programId,
                employee_id: pd.employeeId
            }
        });

        await knex('program_directors')
        .where('program_id', program.programId)
        .del()
        .catch(error => { 
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });
       
        await knex('program_directors')
        .insert(insertProgramDirectors)
        .catch(error => { 
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });
    }
}

async function getBlockTypes() {
    const blockTypes = await knex
        .from('program_block_types')
        .select(['block_type_id as blockTypeId', 'description as blockTypeDescription']);

    return blockTypes.map(bt => {
        return {
            blockTypeId: bt.blockTypeId,
            blockTypeDescription: bt.blockTypeDescription
        }
    });
}

async function getByCurrentUser(user, organizationId) {
    
    let model = knex.table('programs')
        .where('programs.organization_id', organizationId)
        .andWhere('programs.is_active', true);
        
    const programs = await model.select([
        'programs.program_id as programId',
        'programs.name',
        'programs.organization_id as organizationId',
        'programs.description', 
        'programs.duty_time_from as dutyTimeFrom',
        'programs.duty_time_to as dutyTimeTo',
        'programs.allowed_annual_vacation_weeks as allowedAnnualVacationWeeks',
        'programs.allowed_educational_leave_days as allowedEducationalLeaveDays',
        'programs.allowed_emergency_leave_days as allowedEmergencyLeaveDays',
        'programs.total_block_junior as totalBlockJunior',
        'programs.total_block_senior as totalBlockSenior',
        'programs.block_type_id as blockTypeId',
        'programs.min_experience_level as minExperienceLevel',
        'programs.max_experience_level as maxExperienceLevel',
        'programs.senior_learners_start_level as seniorLearnersStartLevel',
        'programs.subject ',
        'programs.body ',
        'programs.certifcate_subject as certificateSubject',
        'programs.certifcate_body as certificateBody '
    ]);   

    for(let i = 0; i < programs.length; i++) {
        let program = programs[i];
        program.totalLearners = 0;
            
        try {
            const totalLearnersCount = await knex('employee_programs').where('program_id', program.programId).count();
            if(totalLearnersCount && totalLearnersCount.length > 0) {
                program.totalLearners = (+totalLearnersCount[0].count);
            }
        }
        catch(error) {
            console.log("Error while getting total count of learners for program:", error)
        }

        programs[i] = program;
    }
    
    return programs;
}

async function getProgramIdByProgramName(organizationId, programName)
{
    return await knex("programs")
        .whereRaw('lower(name) = ?', programName.toLowerCase())
        .andWhere("organization_id", organizationId)
        .select("program_id as programId")
        .first(); 
}

async function deleteAllInactive() {
    const programIds = await knex("programs")
    .where("is_active", false)
    .select('program_id').map(s => s.program_id);

    deletePrograms(programIds, null);
}

async function deletePrograms(programs, user) {

    await knex.transaction(async function(t) {
        await knex("program_directors")
            .transacting(t)
            .whereIn("program_id", programs)
            .del()
            .catch(error => { 
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });

        await knex("employee_programs")
            .transacting(t)
            .whereIn("program_id", programs)
            .del()
            .catch(error => { 
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });

        await knex("academic_years")
            .transacting(t)
            .whereIn("program_id", programs)
            .del()
            .catch(error => { 
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
    
        return await knex("programs")
            .transacting(t)
            .whereIn("program_id", programs)
            .del()
            .catch(error => { 
                if (error && error.code == '23503')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Can not delete programs with related Activities / Announcement / Courses' })) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
    });
}