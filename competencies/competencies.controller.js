const express = require('express');
const router = express.Router();
const competenciesService = require('./competencies.service');
const authorize = require('helpers/authorize')

const Permissions = require("permissions/permissions")

// routes
router.post('/', authorize(Permissions.api.competencies.create), create);
router.put('/', authorize(Permissions.api.competencies.update), update);
router.delete('/', authorize(Permissions.api.competencies.delete), deleteCompetencies);
router.get('/', authorize(Permissions.api.competencies.get), getAll);
router.get('/:id', authorize(Permissions.api.competencies.get), getById);
module.exports = router;

function getAll(req, res, next) {
    competenciesService.getAll(
        req.user,
        req.query.organizationId,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(competencies => res.json(competencies))
    .catch(err => next(err));
}

function getById(req, res, next) {
    competenciesService.getById(req.params.id, req.query.organizationId)
        .then(competencies => competencies ? res.json(competencies) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    competenciesService.create(req.body, req.user)
        .then((data) => res.json(data))
        .catch(err => next(err));
}

function update(req, res, next) {
    competenciesService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteCompetencies(req, res, next) {
    competenciesService.deleteCompetencies(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}
