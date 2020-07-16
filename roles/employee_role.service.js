const config = require('config.json');
const jwt = require('jsonwebtoken');
const Role = require('helpers/role');
const knex = require('../db');

module.exports = {
    getAll,
    createEmployeeRole
};

async function getAll(loggedInUser, role_id, organizationId)
{
  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  let employee_roles = await knex('employee_roles')
    .innerJoin('employees','employees.employee_id','employee_roles.employee_id')
    .innerJoin('users','users.user_id','employees.user_id')
    .where('employee_roles.role_id', role_id)
    .andWhere('employees.organization_id', organizationId)
    .select(['employees.employee_id as employeeId', 'users.name as name', 'users.surname as surname',
      'users.email as email', 'users.profile_photo as profilePhoto'])

  return {employee_roles};
}

async function createEmployeeRole(employee_id, role_id)
{
    return await knex('employee_roles')
      .insert({employee_id, role_id});
}