const express = require('express');
const router = express.Router();
const competencyTypeService = require('./competency_type.service');
const authorize = require('helpers/authorize')
const Permissions = require("permissions/permissions")


// routes
router.post('/', authorize(Permissions.api.competencyType.create), create);
router.put('/', authorize(Permissions.api.competencyType.update), update);
router.get('/', authorize(Permissions.api.competencyType.get), getAll);
router.get('/:id', authorize(Permissions.api.competencyType.get), getById);
router.delete('/', authorize(Permissions.api.competencyType.delete), deleteCompetencyType);

module.exports = router;

function getAll(req, res, next) {       
    competencyTypeService.getAll(
        req.user,
        req.query.organizationId,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(competencyType => res.json(competencyType))
    .catch(err => next(err));
}

function getById(req, res, next) {     
    competencyTypeService.getById(req.params.id , req.query.organizationId)
        .then(competencyType => competencyType ? res.json(competencyType) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}


function create(req, res, next) {
    competencyTypeService.create(req.user, req.body)
        .then((data) => res.json(data))
        .catch(err => next(err));
}

function update(req, res, next) {      
    competencyTypeService.update(req.user, req.body)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteCompetencyType(req, res, next) {
    competencyTypeService.deleteCompetencyType(req.body)
        .then(() => res.json(true))
        .catch(err => next(err));
}
