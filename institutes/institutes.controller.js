const express = require('express');
const router = express.Router();
const instituteService = require('./institute.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), create); 
router.put('/', authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), update); 
router.delete('/', authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), deleteInstitutes); 
router.get('/', authorize([Role.SuperAdmin]), getAll); 
router.get('/:id', authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), getById);  
module.exports = router;

function getAll(req, res, next) {
    instituteService.getAll(
        req.user,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(institutes => institutes && institutes.totalNumberOfRecords > 0 ? res.json(institutes): res.status(404).json({message: "Not found"}))
    .catch(err => next(err));
}

function getById(req, res, next) {
    instituteService.getById(req.params.id, req.user)
        .then(institute => institute ? res.json(institute) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    instituteService.create(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {
    instituteService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteInstitutes(req, res, next) {
    instituteService.deleteInstitutes(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}