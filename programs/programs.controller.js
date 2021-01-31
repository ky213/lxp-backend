const express = require('express');
const router = express.Router();
const programService = require('./program.service');
const authorize = require('helpers/authorize')
const Permissions = require("permissions/permissions")


// routes
router.post('/', authorize(Permissions.api.programs.create), create);
router.put('/', authorize(Permissions.api.programs.update), update);
router.get('/', authorize(Permissions.api.programs.get.useraccess), getAll);
router.get('/v2', authorize(Permissions.api.programs.get.useraccess), getAllV2);
router.get('/block-types', authorize(Permissions.api.programs.get.adminaccess), getBlockTypes);
router.get('/currentuser', authorize(Permissions.api.programs.get.useraccess), getByCurrentUser);
router.get('/:id', authorize(Permissions.api.programs.get.adminaccess), getById);
router.delete('/', authorize(Permissions.api.programs.delete), deletePrograms);

module.exports =  router;

function getAll(req, res, next) {
    programService.getAll( req.user, req.query.organizationId, req.query.pageId, req.query.recordsPerPage, req.query.filter  )
    .then(programs => res.json(programs))
    .catch(err => next(err));
}

function getAllV2(req, res, next) {
    programService.getAllV2( req.user, req.query.organizationId,  req.query.pageId,  req.query.recordsPerPage,  req.query.filter,  req.query.byName )
    .then(programs => res.json(programs))
    .catch(err => next(err));
}

function getById(req, res, next) {
    programService.getById(req.params.id, req.user, req.query.selectedOrganizationId)
        .then(organization => organization ? res.json(organization) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function getByCurrentUser(req, res, next) {
    programService.getByCurrentUser(req.user, req.query.organizationId)
        .then(program => program ? res.json(program) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    programService.create(req.body, req.user)
        .then((data) => { res.json(data)})
        .catch(err => next(err));
}

function update(req, res, next) {   
    programService.update(req.body, req.user)
        .then((data) => { res.json(data)})
        .catch(err => next(err));
}

function getBlockTypes(req, res, next) {     
    programService.getBlockTypes()
        .then(blockTypes => res.json(blockTypes))
        .catch(err => next(err));
}

function deletePrograms(req, res, next) {      
    programService.deletePrograms(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}
