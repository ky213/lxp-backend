const express = require('express');
const router = express.Router();
const activityTypeService = require('./activity_type.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), create); 
router.put('/', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), update);
router.get('/', authorize(), getAll); 
router.get('/:id', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), getById); 

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

function getByCurrentUser(req, res, next) {
    activityTypeService.getByCurrentUser(req.user, req.query.organizationId)
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