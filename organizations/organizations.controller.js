﻿const express = require('express');
const router = express.Router();
const organizationService = require('./organization.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), create); 
router.put('/', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), update); 
router.delete('/', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), deleteOrganizations); 
router.get('/', authorize([Role.SuperAdmin]), getAll); 
router.get('/:id', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), getById);  
router.post('/email', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), sendEmail); 
router.post('/testEmail', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), sendTestEmail); 

module.exports = router;

function getAll(req, res, next) {
    organizationService.getAll(
        req.user,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(organizations => organizations && organizations.totalNumberOfRecords > 0 ? res.json(organizations): res.status(404).json({message: "Not found"}))
    .catch(err => next(err));
}

function getById(req, res, next) {
    organizationService.getById(req.params.id, req.user)
        .then(organization => organization ? res.json(organization) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    organizationService.create(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {
    organizationService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteOrganizations(req, res, next) {
    organizationService.deleteOrganizations(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function sendEmail(req, res, next) {
    organizationService.sendEmail(req.body, req.user)
    .then(data => res.json(data))
    .catch(err => next(err));
}

function sendTestEmail(req, res, next) {
    organizationService.sendTestMailDevEmail(req.body, req.user)
    .then(data => res.json(data))
    .catch(err => res.json(err));
}

