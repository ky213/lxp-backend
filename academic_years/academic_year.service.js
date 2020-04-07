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

async function getByLoggedInUser(loggedInUser, instituteId) {

  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  return await knex.table('academic_years')
    .join('programs', 'programs.program_id', 'academic_years.program_id')    
    .where('academic_years.institute_id', instituteId)
    .select([
      'academic_years.academic_year_id as academicYearId',
      'academic_years.name as academicYearName',
      'academic_years.start_date as startDate',
      'academic_years.end_date as endDate',
      'programs.name as programName'
    ])
    .orderBy('academic_years.start_date', 'desc');
}

async function getById(loggedInUser, academicYearId, instituteId) {
  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  return await knex.table('academic_years')
    .join('programs', 'programs.program_id', 'academic_years.program_id')
    .where('academic_years.institute_id', instituteId)
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

async function getByProgramId(loggedInUser, programId, instituteId) {
  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  return await knex.table('academic_years')
    .join('programs', 'programs.program_id', 'academic_years.program_id')
    .where('academic_years.institute_id', instituteId)
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

async function create(loggedInUser, data, instituteId) {
  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;
  
  data.programs.forEach(p => {
    insertAcademicYear({
      institute_id: instituteId,
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

async function update(loggedInUser, data, instituteId) {
  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  let ay = {
    name: data.name,
    start_date: data.startDate,
    end_date: data.endDate        
  };

  await knex.table('academic_years')
    .where('institute_id', instituteId)
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

async function deleteAcademicYear(loggedInUser, instituteId, academicYearId) {
  return deleteAcademicYears(loggedInUser, instituteId, [academicYearId]);
}

async function deleteAcademicYears(loggedInUser, instituteId, academicYears) {
  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  return knex.transaction(async function(t) {
    await knex.table('blocks')
      .transacting(t)
      .whereIn('academic_year_id', academicYears)
      .del();

    await knex.table('academic_years')
      .transacting(t)
      .where('institute_id', instituteId)
      .whereIn('academic_year_id', academicYears)
      .del();

    return {
      isValid: true,
      errorDetails: null
    }
  });
}