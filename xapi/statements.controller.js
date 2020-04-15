const express = require('express');
const router = express.Router();
const statementService = require('./statement.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.get('/', getAll); 
router.post('/', create); 
router.put('/', create); 

module.exports = router;

function getAll(req, res, next) {
    statementService.getAll(req.user, req.query.statementId, req.query.voidedStatementId, req.query.agent, req.query.verb, req.query.activity, 
        req.query.since, req.query.until, req.query.limit, req.query.ascending, req.query.page, req.query.take)
    .then(statements => res.json(statements))
    .catch(err => next(err));
}

function create(req, res, next) {
    statementService.create(req.body, req.query.statementId)
        .then(() => res.status(204).send())
        .catch(err => next(err));
}

function update(req, res, next) {
    statementService.update(req.body, req.statementId)
        .then(() => res.status(204).send())
        .catch(err => next(err));
}

