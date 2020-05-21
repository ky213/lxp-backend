const express = require('express');
const router = express.Router();
const roleService = require('./role.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.get('/', getAll); // admin only
router.get('/getFmRoles', getFmRoles); // admin only

module.exports = router;

function getAll(req, res, next) {
  roleService.getAll()    
    .then(data => {
        return res.json(data);
    })
    .catch((error) => console.log('Error getAll:', error));
}

function getFmRoles(req, res, next) {
  roleService.getFmRoles()    
    .then(data => {
        return res.json(data);
    })
    .catch((error) => console.log('Error getAll:', error));
}