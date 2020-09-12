const express = require('express');
const router = express.Router();
const dashboardService = require('./dashboard.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");

const {v4: uuidv4} = require('uuid');
var AdmZip = require('adm-zip');
var fs = require('fs');

// routes
router.get('/distribution/progress', authorize(), progressDistrubitionData);
router.get('/distribution/progress/users/completed', authorize(), findProgressDistrubitionCompletedUserData);
router.get('/distribution/progress/users/attempted', authorize(), findProgressDistrubitionAttemptedUserData);
router.get('/distribution/progress/users/not_attempted', authorize(), findProgressDistrubitionNotAttemptedUserData);

router.get('/distribution/breakdown', authorize(), breakdownDistrubitionData);
router.get('/distribution/breakdown/users/search', authorize(), breakdownDistrubitionData);

module.exports = router;

async function progressDistrubitionData(req, res, next) {
    dashboardService.progressDistrubitionData(req.user, req.query.organizationId, req.query.programId, req.query.courseId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function findProgressDistrubitionCompletedUserData(req, res, next) {
    dashboardService.findProgressDistrubitionCompletedUserData(req.user, req.query.programId, req.query.courseId, req.query.offset, req.query.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function findProgressDistrubitionAttemptedUserData(req, res, next) {
    dashboardService.findProgressDistrubitionAttemptedUserData(req.user, req.query.programId, req.query.courseId, req.query.offset, req.query.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function findProgressDistrubitionNotAttemptedUserData(req, res, next) {
    dashboardService.findProgressDistrubitionNotAttemptedUserData(req.user, req.query.programId, req.query.courseId, req.query.offset, req.query.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function breakdownDistrubitionData(req, res, next) {
    dashboardService.breakdownDistrubitionData(req.user, req.query.programId, req.query.courseId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function breakdownDistrubitionUsersSearch(req, res, next) {
    dashboardService.breakdownDistrubitionUsersSearch(req.user, req.query.programId, req.query.courseId, req.query.minAnswers, req.query.maxAnswers, req.query.offset, req.query.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}
