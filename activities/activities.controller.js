const express = require('express');
const router = express.Router();
const activityService = require('./activity.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
 
router.post('/', authorize(), create); 
router.post('/log', authorize(), logActivity); 
router.put('/log', authorize(), updateLogActivity); 
router.get('/log/:id', authorize(), getLogActivityById);  
router.put('/log/:id/status', authorize(), updateLogActivityStatus); 
router.put('/', authorize(), update); 
router.get('/', authorize(), getAll); 
router.get('/types', authorize(), getActivityTypes);  
router.get('/participation-levels', authorize(), getParticipationLevels);  

router.put('/:id/status', authorize(), updateStatus); 
router.get('/:id', authorize(), getById);  

router.get('/:id/replies', authorize(), getReplies);  
router.post('/reply', authorize(), addReply);
router.put('/reply/:id', authorize(), updateReply);
router.delete('/reply/:id', authorize(), deleteReply);

module.exports = router;

function getAll(req, res, next) {
    activityService.getAll(req.user, req.query.from, req.query.to, req.query.selectedOrganizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getActivityTypes(req, res, next) {
    activityService.getActivityTypes(req.user, req.query.selectedOrganizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getById(req, res, next) {
    activityService.getById(req.params.id, req.user, req.query.selectedOrganizationId)
        .then(event => event ? res.json(event) : res.status(404).json({message: "Activity not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    activityService.create(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {
    activityService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function updateStatus(req, res, next) {
    activityService.updateStatus(req.params.id, req.body, req.user, req.query.filterOrganizationId)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function logActivity(req, res, next) {
    activityService.logActivity(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}


function updateLogActivity(req, res, next) {
    activityService.updateLogActivity(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function getParticipationLevels(req, res, next) {
    activityService.getParticipationLevels( req.user)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getLogActivityById(req, res, next) {
    activityService.getLogActivityById(req.params.id, req.user)
        .then(event => event ? res.json(event) : res.status(404).json({message: "Activity not found"}))
        .catch(err => next(err));
}

function updateLogActivityStatus(req, res, next) {
    console.log("Update log activity status:", req.params.id, req.body, req.user)
    activityService.updateLogActivityStatus(req.params.id, req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function getReplies(req, res, next) {
    activityService.getReplies(req.params.id, req.user)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function addReply(req, res, next) {
    activityService.addReply(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function updateReply(req, res, next) {
    activityService.updateReply(req.params.id, req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteReply(req, res, next) {
    //console.log("Got to delete reply:", req.params.id, req.user)
    activityService.deleteReply(req.params.id, req.user)
        .then(() => res.json(true))
        .catch(next);
}
