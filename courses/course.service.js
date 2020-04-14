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
  return knex('courses');
}

async function getById(loggedInUser, selectedInstituteId, courseId) {

  return knex('courses')
    .where('course_id', courseId);
}

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