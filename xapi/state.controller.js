const express = require('express');
const router = express.Router();
const stateService = require('./state.service');
const authorize = require('helpers/authorize')



// routes
router.post('/', create); 
router.put('/', create); 
router.get('/', getById); 

module.exports = router;

function getById(req, res, next) {
    stateService.getById(req.query.activityId, req.query.agent, req.query.stateId, req.query.registration)
        .then((data) => res.status(200).send(data))
        .catch(err => next(err));
}

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

