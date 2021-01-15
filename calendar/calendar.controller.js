const express = require('express');
const router = express.Router();
const calendarService = require('./calendar.service');
const authorize = require('helpers/authorize')

const Permissions = require("permissions/permissions")

// routes
router.put('/event/:id/status', authorize(Permissions.api.calendar.update), updateStatus);
router.post('/event', authorize(Permissions.api.calendar.create), create);
router.put('/event', authorize(Permissions.api.calendar.update), update);
router.get('/', authorize(Permissions.api.calendar.get), getAll);
router.get('/event/:id', authorize(Permissions.api.calendar.get), getById);

module.exports = router;

function getAll(req, res, next) {
    calendarService.getAll(req.user)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getById(req, res, next) {
    calendarService.getById(req.params.id, req.user)
        .then(event => event ? res.json(event) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    calendarService.create(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {
    calendarService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function updateStatus(req, res, next) {
    calendarService.updateStatus(req.params.id, req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}
