const express = require('express');
const router = express.Router();
const programService = require('./program.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), create); 
router.put('/', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), update); 
router.get('/', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), getAll); 
router.get('/block-types', authorize([Role.Admin, Role.ProgramDirector, Role.OrganizationManager]), getBlockTypes); 
router.get('/currentuser', authorize(), getByCurrentUser);
router.get('/:id', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), getById); 
router.delete('/', authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), deletePrograms); 

module.exports = router;

function getAll(req, res, next) {       
    programService.getAll(
        req.user,
        req.query.organizationId,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(organizations => res.json(organizations))
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
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {   
    programService.update(req.body, req.user)
        .then(() => res.json(true))
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