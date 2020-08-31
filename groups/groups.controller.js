const express = require('express');
const router = express.Router();
const groupsService = require('./groups.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', authorize(), create); 
router.put('/', authorize(), update); 
router.delete('/', authorize(), deletegroups); 
router.get('/', authorize(), getAll); 
router.get('/:id', authorize(), getById);  
module.exports = router;

function getAll(req, res, next) {
    groupsService.getAll(
        req.user,
        req.query.organizationId,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(groups => res.json(groups))
    .catch(err => next(err));
}

function getById(req, res, next) {
    groupsService.getById(req.params.id)
        .then(groups => groups ? res.json(groups) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    groupsService.create(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {
    groupsService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deletegroups(req, res, next) {
    groupsService.deleteGroups(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}