const express = require('express');
const router = express.Router();
const roleService = require('./role.service');
const authorize = require('helpers/authorize')

const Permissions = require("permissions/permissions")
const PermissionsService = require("permissions/permissions.service")

// routes
router.get('/', authorize(Permissions.api.roles.get), getAll); // admin only
router.post('/create', authorize(Permissions.api.roles.create), create()); // admin only
router.put('/update', authorize(Permissions.api.roles.update), update()); // admin only
router.get('/getCmRoles',authorize(Permissions.api.roles.get), getCmRoles); // admin only

module.exports = router;

function getAll(req, res, next) {
  var organizationId = PermissionsService.isSuperAdmin(req.user)?req.query.organizationId: req.user.organizationId;

  roleService.getAll(organizationId)
    .then(data => {
        return res.json(data);
    })
    .catch((error) => console.log('Error getAll:', error));
}

function getCmRoles(req, res, next) {

  var organizationId = PermissionsService.isSuperAdmin(req.user)?req.query.organizationId: req.user.organizationId;

  roleService.getCmRoles(organizationId)
    .then(data => {
        return res.json(data);
    })
    .catch((error) => console.log('Error getAll:', error));
}

function create(req, res, next) {
    roleService
        .create(req.user, req.body, req.body.organizationId)
        .then(data => {
            res.json(data);
        })
        .catch(err => {
            console.log('Error: ',err);
            next(err)
        });
}

function update(req, res, next) {
    roleService
        .update(req.user, req.body, req.body.organizationId)
        .then(data => {
            res.json(data);
        })
        .catch(err => {
            console.log('Error: ',err);
            next(err)
        });
}
