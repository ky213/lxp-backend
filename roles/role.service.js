const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db');

module.exports = {
    getAll,
    getFmRoles
};

async function getAll() {
  return await knex('roles');
}

async function getFmRoles() {
  const fmRoles = [Role.Admin, Role.InstituteManager, Role.ProgramDirector, 
    Role.FacultyMember];    
  return await knex('roles').whereIn('role_id', fmRoles).select('role_id as roleId', 'name');
}