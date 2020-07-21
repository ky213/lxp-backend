const express = require('express');
const router = express.Router();
const roleService = require('./role.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.get('/', getAll); // admin only
router.get('/getCmRoles', getCmRoles); // admin only

module.exports = router;

function getAll(req, res, next) {
  roleService.getAll()    
    .then(data => {
        return res.json(data);
    })
    .catch((error) => console.log('Error getAll:', error));
}

function getCmRoles(req, res, next) {
  roleService.getCmRoles()    
    .then(data => {
        return res.json(data);
    })
    .catch((error) => console.log('Error getAll:', error));
}