const express = require('express');
const router = express.Router();
const statementService = require('./statement.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');

// routes
router.post('/', create); 
router.put('/', create); 

module.exports = router;

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

