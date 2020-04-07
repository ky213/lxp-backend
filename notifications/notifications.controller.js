const express = require('express');
const router = express.Router();
const notificationService = require('./notification.service');
const authorize = require('helpers/authorize')

// routes
 
router.post('/', authorize(), create); 
router.get('/', authorize(), getAll); 
router.get('/unread', authorize(), getAllUnread);  
router.get('/unread-count', authorize(), getUnreadCount);  
router.put('/:id/read', authorize(), setRead); 
router.get('/:id', authorize(), getById);  


module.exports = router;

function getAll(req, res, next) {
    notificationService.getAll(req.user, req.query.page, req.query.take, req.query.selectedInstituteId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getAllUnread(req, res, next) {
    notificationService.getAllUnread(req.user, req.query.limit, req.query.selectedInstituteId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getUnreadCount(req, res, next) {
    notificationService.getUnreadCount(req.user, req.query.selectedInstituteId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getById(req, res, next) {
    notificationService.getById(req.params.id, req.user, req.query.selectedInstituteId)
        .then(event => event ? res.json(event) : res.status(404).json({message: "Notification not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    notificationService.create(req.body, req.user, req.query.selectedInstituteId)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function setRead(req, res, next) {
    notificationService.setRead(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

