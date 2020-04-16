const knex = require('../db');
const converter = require("helpers/converter");
const moment = require('moment');
const Role = require('helpers/role');

module.exports = {
  getAll,
  getById,
  create,
  update,
  addFile,
  deleteCourse
};

async function getAll(loggedInUser, selectedInstituteId, programId) {
  if (!loggedInUser) {
    return;
  }

  return await knex('courses')
    .join('programs', 'programs.program_id', 'courses.program_id')
    .where('courses.institute_id', loggedInUser.role == Role.SuperAdmin && selectedInstituteId ? selectedInstituteId : loggedInUser.institute)
    //.andWhere('courses.program_id', programId)
    .select([
      'courses.course_id as courseId',
      'courses.name',
      'courses.description',
      'courses.image',
      'courses.starting_date as startingDate',
      'courses.period_days as periodDays',
      'courses.content_path as contentPath',
      'programs.program_id as programId',
      'programs.name as programName',
    ])
}

async function getById(loggedInUser, courseId, selectedInstituteId) {
  if (!loggedInUser)
    return;
  
  return knex('courses')
    .join('programs', 'programs.program_id', 'courses.program_id')
    .where('courses.institute_id', loggedInUser.role == Role.SuperAdmin && selectedInstituteId ? selectedInstituteId : loggedInUser.institute)
    .andWhere('courses.course_id', courseId)
    .select([
        'courses.course_id as courseId',
        'courses.institute_id as instituteId',
        'courses.name as name',
        'courses.description as description',
        'courses.period_days as periodDays',
        'courses.starting_date as startingDate',
        'courses.program_id as programId',
        'courses.content_path as contentPath',
        'programs.name as programName',
    ])
    .limit(1)
    .first();
}


async function addFile(loggedInUser, data) {
  console.log('addFile', data);

  return await knex('announcement_files')
    .insert({
      announcement_id: data.announcementId,
      file: Buffer.from(data.file),
      name: data.name,
      type: data.type,
      extension: data.extension,
      size: data.size
    })
    .returning('announcement_file_id');
};


async function getByUser(loggedInUser, includeRead, selectedInstituteId) {
  
  if (!loggedInUser || !loggedInUser.employeeId)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;
  
  return knex('courses')
    .where('course_id', courseId);
}

async function create(loggedInUser, selectedInstituteId, programId, name, description, periodDays, startingDate, contentPath) {
  if (!loggedInUser)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  return knex("courses")
    .insert({
      institute_id: instituteId,
      program_id: programId,
      name: name,
      description: description,
      content_path: contentPath,
      image: 'test',
      period_days: periodDays,
      starting_date: moment(startingDate).toDate(),
      generated: knex.fn.now()
    });
}

async function update(loggedInUser, selectedInstituteId, courseId, programId, name, description, periodDays, startingDate) {
  if (!loggedInUser)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  return knex("courses")
    .where('course_id', courseId)
    .update({
      program_id: programId,
      name: name,
      description: description,
      image: 'test',
      period_days: periodDays,
      starting_date: moment(startingDate).toDate(),
      generated: knex.fn.now()
    });
}

async function deleteCourse(loggedInUser, id) {
  return knex("courses")
    .where("course_id", id)
    .del();
}