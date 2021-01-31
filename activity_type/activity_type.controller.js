const express = require('express');
const router = express.Router();
const activityTypeService = require('./activity_type.service');
const authorize = require('helpers/authorize')

const Permissions = require("permissions/permissions")

// routes
router.post('/', authorize(Permissions.api.activityTypes.create), create);
router.put('/', authorize(Permissions.api.activityTypes.update), update);
router.get('/', authorize(Permissions.api.activityTypes.get.useraccess), getAll);
router.get('/:id', authorize(Permissions.api.activityTypes.get.adminaccess), getById);

router.delete('/', authorize(Permissions.api.activityTypes.delete), deleteActivityTypes);

module.exports = router;

function getAll(req, res, next) {       
    activityTypeService.getAll(
        req.user,
        req.query.organizationId,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(activityTypes => res.json(activityTypes))
    .catch(err => next(err));
}

function getById(req, res, next) {     
    activityTypeService.getById(req.params.id, req.user, req.query.selectedOrganizationId)
        .then(activityType => activityType ? res.json(activityType) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    activityTypeService.create(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {      
    activityTypeService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteActivityTypes(req, res, next) {
    activityTypeService.deleteActivityTypes(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

