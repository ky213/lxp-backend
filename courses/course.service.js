const knex = require('../db');
const converter = require("helpers/converter");
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
  return await knex('courses')
    .where('courses.institute_id', loggedInUser.role == Role.SuperAdmin && selectedInstituteId ? selectedInstituteId : loggedInUser.institute)
    .select([
      'courses.course_id as courseId',
      'courses.name',
      'courses.description',
      'courses.image',
      'courses.starting_date as startDate',
      'courses.period_days as periodDays',
      'courses.content_path as contentPath'
    ])
}

async function getById(loggedInUser, selectedInstituteId, courseId) {

  return await knex('courses')
    .where('courses.institute_id', loggedInUser.role == Role.SuperAdmin && selectedInstituteId ? selectedInstituteId : loggedInUser.institute)
    .andWhere('courses.course_id', courseId)
    .select([
      'courses.course_id as courseId',
      'courses.name',
      'courses.description',
      'courses.image',
      'courses.start_date as startDate',
      'courses.period_days as periodDays',
      'courses.content_path as contentPath'
    ]);
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

async function create(loggedInUser, data) {
  console.log('loggedInUser', loggedInUser);
  return knex("courses")
    .insert({
      institute_id: data.instituteId,
      program_id: data.programId,
      name: data.name,
      description: data.description,
      // content_path
      // image: 
      period_days: data.periodDays,
      starting_date: data.startingDate,
      generated: new Date()
    });
}

async function update(loggedInUser, data) {
  console.log('update', data);
  // return knex
  // .transaction(async function(t) {
  //   await knex("courses")
  //       .transacting(t)
  //       .where('course_id', data.courseId);        
  // });
}

async function deleteCourse(loggedInUser, id) {
  return knex("courses")
    .where("course_id", id)
    .del();
}

