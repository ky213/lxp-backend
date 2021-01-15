const express = require('express');
const router = express.Router();
const notificationService = require('./notification.service');
const authorize = require('helpers/authorize')
const Permissions = require("permissions/permissions")

// routes
 
router.post('/', authorize(Permissions.api.notifications.create), create);
router.get('/', authorize(Permissions.api.notifications.get), getAll);
router.get('/unread', authorize(Permissions.api.notifications.get), getAllUnread);
router.get('/unread-count', authorize(Permissions.api.notifications.get), getUnreadCount);
router.put('/:id/read', authorize(Permissions.api.notifications.update), setRead);
router.get('/:id', authorize(Permissions.api.notifications.get), getById);


module.exports = router;

function getAll(req, res, next) {
    notificationService.getAll(req.user, req.query.page, req.query.take, req.query.selectedOrganizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getAllUnread(req, res, next) {
    notificationService.getAllUnread(req.user, req.query.limit, req.query.selectedOrganizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getUnreadCount(req, res, next) {
    notificationService.getUnreadCount(req.user, req.query.selectedOrganizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getById(req, res, next) {
    notificationService.getById(req.params.id, req.user, req.query.selectedOrganizationId)
        .then(event => event ? res.json(event) : res.status(404).json({message: "Notification not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    notificationService.create(req.body, req.user, req.query.selectedOrganizationId)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function setRead(req, res, next) {
    notificationService.setRead(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

