const express = require('express');
const router = express.Router();
const groupTypeService = require('./group_type.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', authorize(), create); 
router.put('/', authorize(), update);
router.get('/', authorize(), getAll); 
router.get('/:id', authorize(), getById); 
router.delete('/', authorize(), deletegrouptypes); 

module.exports = router;

function getAll(req, res, next) {       
    groupTypeService.getAll(
        req.user,
        req.query.organizationId,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(groupTypes => res.json(groupTypes))
    .catch(err => next(err));
}

function getById(req, res, next) {     
    groupTypeService.getById(req.params.id)
        .then(groupType => groupType ? res.json(groupType) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}


function create(req, res, next) {
    groupTypeService.create(req.body)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {      
    groupTypeService.update(req.body)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deletegrouptypes(req, res, next) {
    groupTypeService.deletegrouptypes(req.body)
        .then(() => res.json(true))
        .catch(err => next(err));
}