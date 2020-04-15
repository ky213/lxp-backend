const knex = require('../db');
const converter = require("helpers/converter");
const Role = require('helpers/role');

module.exports = {
  getAll,
  getById,
  getByUser,
  create,
  update,
  deleteCourse
};

async function getAll(loggedInUser, selectedInstituteId) {
  if (!loggedInUser)
    return;
  
  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  return knex('courses')
    .join('programs', 'programs.program_id', 'courses.program_id')
    .select([
        'courses.course_id as courseId',
        'courses.institute_id as instituteId',
        'courses.name as name',
        'courses.period_days as periodDays',
        'courses.starting_date as startingDate',
        'programs.name as programName',
    ]);
}

async function getById(loggedInUser, courseId, selectedInstituteId) {
  if (!loggedInUser)
    return;
  
  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  return knex('courses')
    .join('programs', 'programs.program_id', 'courses.program_id')
    .where('courses.course_id', courseId)
    .select([
        'courses.course_id as courseId',
        'courses.institute_id as instituteId',
        'courses.name as name',
        'courses.description as description',
        'courses.period_days as periodDays',
        'courses.starting_date as startingDate',
        'courses.program_id as programId',
        'programs.name as programName',
    ])
    .limit(1)
    .first();
}

async function getByUser(loggedInUser, includeRead, selectedInstituteId) {
  
  if (!loggedInUser || !loggedInUser.employeeId)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;
  
  return knex('courses')
    .where('course_id', courseId);
}

async function create(loggedInUser, data, selectedInstituteId) {
  if (!loggedInUser)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  return knex("courses")
    .insert({
      institute_id: data.instituteId,
      program_id: data.programId,
      name: data.name,
      description: data.description,
      content_path: data.contentPath,
      image: 'test',
      period_days: data.periodDays,
      starting_date: data.startingDate,
      generated: new Date()
    });
}

async function update(loggedInUser, data, selectedInstituteId) {
  if (!loggedInUser)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  console.log('update', data);

  return knex("courses")
    .where('course_id', data.courseId)
    .update({
      program_id: data.programId,
      name: data.name,
      description: data.description,
      content_path: data.contentPath,
      image: 'test',
      period_days: data.periodDays,
      starting_date: data.startingDate,
      generated: new Date()      
    });
}

async function deleteCourse(loggedInUser, id) {
  return knex("courses")
    .where("course_id", id)
    .del();
}