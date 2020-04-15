const knex = require('../db');
const converter = require("helpers/converter");
const Role = require('helpers/role');

module.exports = {
  getAll,
  getById,
  create,
  update,
  addFile,
  deleteFile,
  downloadFile,
  deleteCourses
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
  if (!announcementId) {
    return null;
  }

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


async function create(loggedInUser, data) {

  return knex
  .transaction(async function(t) {
    /*
    const ids = await knex("announcements")
      .transacting(t)
      .insert({
        title: data.title,
        text: data.text,
        date_from: data.dateFrom,
        date_to: data.dateTo,
        is_active: data.isActive,
        institute_id: data.instituteId
      })
      .returning("announcement_id");
  */
  });
}

async function update(loggedInUser, data) {
  
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
}

async function deleteFile(loggedInUser, id) {
  console.log('deleteFile => ', id);
  
  return knex("announcement_files")
    .where("announcement_file_id", id)
    .del();
}

async function downloadFile(loggedInUser, id) {
  console.log('downloadFile => ', id);
  return knex("announcement_files")
    .where("announcement_file_id", id)
    .select([
      "announcement_files.name",
      "announcement_files.file"      
    ])
    .first();
}

async function deleteCourses(loggedInUser, courses) {
  console.log("Delete courses: ", courses); 

  /*
  return knex
  .transaction(async function(t) {
    await knex("employee_announcement_reads")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();
    
    await knex("announcement_files")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();

    await knex("announcement_roles")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();

    await knex("announcement_programs")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();

    await knex("announcements")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();
  });
  */
}
