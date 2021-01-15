const express = require('express');
const router = express.Router();
const experienceLevelService = require('./experience_level.service');
const authorize = require('helpers/authorize')

const Permissions = require("permissions/permissions")

// routes
router.get('/', authorize(Permissions.api.experienceLevels.get), getAll);
router.get('/getByExpLevelId', authorize(Permissions.api.experienceLevels.get), getByExpLevelId);
router.get('/getByProgramId', authorize(Permissions.api.experienceLevels.get), getByProgramId);
router.post('/', authorize(Permissions.api.experienceLevels.create), add);
router.put('/', authorize(Permissions.api.experienceLevels.update), update);
router.delete('/:expLevelId', authorize(Permissions.api.experienceLevels.delete), deleteExpLevel);

module.exports = router;

function getAll(req, res, next) {
  experienceLevelService.getAll(req.user)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function getByExpLevelId(req, res, next) {
  experienceLevelService.getByExpLevelId(req.user, req.query.expLevelId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function getByProgramId(req, res, next) {
  console.log('getByProgramId', req.query);
  experienceLevelService.getByProgramId(req.user, req.query.programId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function add(req, res, next) {
  experienceLevelService.add(req.user, req.body)
        .then((data) => res.json(data))
        .catch(err => next(err));  
}

function update(req, res, next) {
  experienceLevelService.update(req.user, req.query.expLevelId, req.query.name)
        .then((data) => res.json(data))
        .catch(err => next(err));  
}

function deleteExpLevel(req, res, next) {
  experienceLevelService.deleteExpLevel(req.user, req.params.expLevelId)
        .then((data) => res.json(data))
        .catch(err => next(err));  
}
