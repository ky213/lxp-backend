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
  deleteCourses,
  getAllJoinedCourses,
  requestToJoinCourse
};

async function getAll(loggedInUser, selectedOrganizationId, programId, pageId, recordsPerPage, filter) {
  if (!loggedInUser) {
    return;
  }

  let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;


  console.log('=>', selectedOrganizationId, programId, pageId, recordsPerPage);

  let model = knex('courses')
    .join('programs', 'programs.program_id', 'courses.program_id')
    .where('courses.organization_id', organizationId);

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

async function getById(loggedInUser, courseId, selectedOrganizationId) {
  if (!loggedInUser)
    return;
  
  return knex('courses')
    .join('programs', 'programs.program_id', 'courses.program_id')
    .where('courses.organization_id', loggedInUser.role == Role.SuperAdmin && selectedOrganizationId ? selectedOrganizationId : loggedInUser.organization)
    .andWhere('courses.course_id', courseId)
    .select([
        'courses.course_id as courseId',
        'courses.organization_id as organizationId',
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


async function getByUser(loggedInUser, includeRead, selectedOrganizationId) {
  
  if (!loggedInUser || !loggedInUser.employeeId)
    return;

  let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;
  
  return knex('courses')
    .where('course_id', courseId);
}

async function create(loggedInUser, selectedOrganizationId, programId, name, description, periodDays, startingDate, logo, contentPath) {
  if (!loggedInUser)
    return;

  let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

  return knex("courses")
    .insert({
      organization_id: organizationId,
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

async function update(loggedInUser, selectedOrganizationId, courseId, programId, name, description, periodDays, startingDate, logo) {
  if (!loggedInUser)
    return;

  let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

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

async function deleteCourses(loggedInUser, courseIds, selectedOrganizationId) {
  if (!loggedInUser)
    return;

  let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

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

async function getAllJoinedCourses(loggedInUser, selectedOrganizationId, pageId, recordsPerPage, filter) {
  if (!loggedInUser) {
    return;
  }

  let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

  console.log('=>', selectedOrganizationId, loggedInUser, pageId, recordsPerPage);

  let model = knex('courses')
    .join('user_courses', 'user_courses.course_id', 'courses.course_id')
    .where('courses.organization_id', organizationId);
    

  if (loggedInUser)
    model.andWhere('user_courses.user_id', loggedInUser.userId);

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
      'user_courses.joining_date as JoiningDate',
    ]);

    return {
      courses,
      totalNumberOfRecords
    }
}

async function requestToJoinCourse(loggedInUser, courseId)  {
  if (!loggedInUser)
  return;

  return knex('user_courses')
  .insert({
    user_id: loggedInUser.userId,
    course_id: courseId,
    is_able_to_join: false,
    generated: knex.fn.now()
  });
}
