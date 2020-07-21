const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db');

module.exports = {
    getAll,
    getCmRoles
};

async function getAll() {
  return await knex('roles');
}

async function getCmRoles() {
  const cmRoles = [Role.Admin, Role.LearningManager, Role.ProgramDirector, 
    Role.CourseManager];    
  return await knex('roles').whereIn('role_id', cmRoles).select('role_id as roleId', 'name');
}