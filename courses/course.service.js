const knex = require('../db');
const moment = require('moment');
const Role = require('helpers/role');
const fs = require('fs');
const path = require('path');

module.exports = {
  getAll,
  getById,
  create,
  update,
  addFile,
  deleteCourses
};

async function getAll(loggedInUser, selectedInstituteId, programId, pageId, recordsPerPage, filter) {
  if (!loggedInUser) {
    return;
  }

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;


  console.log('=>', selectedInstituteId, programId, pageId, recordsPerPage);

  let model = knex('courses')
    .join('programs', 'programs.program_id', 'courses.program_id')
    .where('courses.institute_id', instituteId);

  if (programId)
    model.andWhere('courses.program_id', programId);
    
  var totalNumberOfRecords = (await model.clone().count().first()).count;

  let offset = (pageId - 1) * recordsPerPage;

  var courses = await model.clone()
    .orderBy('name', 'asc')
    .offset(offset)
    .limit(recordsPerPage)
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
    ]);

    return {
      courses,
      totalNumberOfRecords
    }
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
        'courses.image',
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

async function create(loggedInUser, selectedInstituteId, programId, name, description, periodDays, startingDate, logo, contentPath) {
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
      image: logo,
      period_days: periodDays,
      starting_date: startingDate && moment(startingDate).format() || null,
      generated: knex.fn.now()
    });
}

async function update(loggedInUser, selectedInstituteId, courseId, programId, name, description, periodDays, startingDate, logo) {
  if (!loggedInUser)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  return knex("courses")
    .where('course_id', courseId)
    .update({
      program_id: programId,
      name: name,
      description: description,
      image: logo,
      period_days: periodDays,
      starting_date: startingDate && moment(new Date(startingDate)).format() || null,
      generated: knex.fn.now()
    });
}

async function deleteCourses(loggedInUser, courseIds, selectedInstituteId) {
  if (!loggedInUser)
    return;

  let instituteId = (loggedInUser.role == Role.SuperAdmin && selectedInstituteId) ? selectedInstituteId : loggedInUser.institute;

  let contentPaths = await knex('courses').whereIn("course_id", courseIds).select(['content_path as contentPath']);

  contentPaths.forEach(p => deleteFolderContent(p));  

  return knex("courses")
    .whereIn("course_id", courseIds)
    .del();
}

function deleteFolderContent (folderPath) {
  const dir = `./upload${folderPath.contentPath}`;

  if (!fs.existsSync(dir)) {
    return;
  }

  fs.readdir(dir, (err, files) => {

    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(dir, file), err => {
        if (err) throw err;
      });
    }

    fs.rmdirSync(dir);
  });  
}