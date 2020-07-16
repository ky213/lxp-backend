const knex = require('../db'); 
const Role = require('helpers/role');

module.exports = {
  getByLoggedInUser,
  getById,
  getByProgramId,
  create,
  update,
  deleteAcademicYear,
  deleteAcademicYears
};

async function getByLoggedInUser(loggedInUser, organizationId) {

  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  return await knex.table('academic_years')
    .join('programs', 'programs.program_id', 'academic_years.program_id')    
    .where('academic_years.organization_id', organizationId)
    .select([
      'academic_years.academic_year_id as academicYearId',
      'academic_years.name as academicYearName',
      'academic_years.start_date as startDate',
      'academic_years.end_date as endDate',
      'programs.name as programName'
    ])
    .orderBy('academic_years.start_date', 'desc');
}

async function getById(loggedInUser, academicYearId, organizationId) {
  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  return await knex.table('academic_years')
    .join('programs', 'programs.program_id', 'academic_years.program_id')
    .where('academic_years.organization_id', organizationId)
    .andWhere('academic_year_id', academicYearId)
    .select([
      'academic_years.academic_year_id as academicYearId',
      'academic_years.name as academicYearName',
      'academic_years.start_date as startDate',
      'academic_years.end_date as endDate',
      'programs.program_id as programId',
      'programs.name as programName'
    ])
    .first();
}

async function getByProgramId(loggedInUser, programId, organizationId) {
  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  return await knex.table('academic_years')
    .join('programs', 'programs.program_id', 'academic_years.program_id')
    .where('academic_years.organization_id', organizationId)
    .andWhere('academic_years.program_id', programId)
    .select([
      'academic_years.academic_year_id as academicYearId',
      'academic_years.name as academicYearName',
      'academic_years.start_date as startDate',
      'academic_years.end_date as endDate',
      'programs.program_id as programId',
      'programs.name as programName'
    ]);
}

async function create(loggedInUser, data, organizationId) {
  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;
  
  data.programs.forEach(p => {
    insertAcademicYear({
      organization_id: organizationId,
      name: data.name,
      start_date: data.startDate,
      end_date: data.endDate, 
      program_id: p.programId});
  })

  return {
    isValid: true,
    errorDetails: null
  }
}

async function update(loggedInUser, data, organizationId) {
  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  let ay = {
    name: data.name,
    start_date: data.startDate,
    end_date: data.endDate        
  };

  await knex.table('academic_years')
    .where('organization_id', organizationId)
    .andWhere('academic_year_id', data.academicYearId)
    .update(ay);

  return {
    isValid: true,
    errorDetails: null
  }
}

async function insertAcademicYear(academicYear) {
  await knex.table('academic_years')
    .insert(academicYear);
}

async function deleteAcademicYear(loggedInUser, organizationId, academicYearId) {
  return deleteAcademicYears(loggedInUser, organizationId, [academicYearId]);
}

async function deleteAcademicYears(loggedInUser, organizationId, academicYears) {
  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  return knex.transaction(async function(t) {
    await knex.table('blocks')
      .transacting(t)
      .whereIn('academic_year_id', academicYears)
      .del();

    await knex.table('academic_years')
      .transacting(t)
      .where('organization_id', organizationId)
      .whereIn('academic_year_id', academicYears)
      .del();

    return {
      isValid: true,
      errorDetails: null
    }
  });
}