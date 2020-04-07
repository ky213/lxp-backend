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

function getFmRoles() {
  return Role.getFmRoles();
}