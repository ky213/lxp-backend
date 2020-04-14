const express = require('express');
const router = express.Router();
const stateService = require('./state.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', create); 
router.put('/', create); 

module.exports = router;

function create(req, res, next) {
    stateService.create(req.body, req.query.activityId, req.query.agent, req.query.stateId, req.query.registration)
        .then(() => res.status(204).send())
        .catch(err => next(err));
}

function update(req, res, next) {
    statementService.update(req.body, req.query.activityId, req.query.agent, req.query.stateId, req.query.registration)
        .then(() => res.status(204).send())
        .catch(err => next(err));
}

