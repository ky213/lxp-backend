const express = require('express');
const router = express.Router();
const employeeRoleService = require('./employee_role.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');
const converter = require('helpers/converter')

// routes
router.get('/', authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), getAll);
router.get('/', createEmployeeRole);

module.exports = router;

async function getAll(req, res, next)
{
  employeeRoleService.getAll(req.user, req.query.roleId, req.query.instituteId)
        .then(data => {          
          let employee_roles = data.employee_roles.map(d => ({...d, profilePhoto: converter.ConvertImageBufferToBase64(d.profilePhoto)}));
          return (employee_roles ? res.json({employee_roles}) : res.status(404).json({message: "Not found"}))})
        .catch(err => next(err));
}

function createEmployeeRole(req, res, next)
{
  employeeRoleService.createEmployeeRole(req.body.employeeId, req.body.roleId)
    .then(data =>
      res.json(data)
  )
  .catch(err => next(err));
}