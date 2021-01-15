const express = require('express');
const router = express.Router();
const dashboardService = require('./dashboard.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");
const Permissions = require("permissions/permissions")


const {v4: uuidv4} = require('uuid');
var AdmZip = require('adm-zip');
var fs = require('fs');

// routes
router.post('/distribution/progress', authorize(Permissions.api.dashboards.get), progressDistrubitionData);
router.post('/distribution/progress/users/completed', authorize(Permissions.api.dashboards.get), findProgressDistrubitionCompletedUserData);
router.post('/distribution/progress/users/attempted', authorize(Permissions.api.dashboards.get), findProgressDistrubitionAttemptedUserData);
router.post('/distribution/progress/users/not_attempted', authorize(Permissions.api.dashboards.get), findProgressDistrubitionNotAttemptedUserData);
router.post('/distribution/breakdown', authorize(Permissions.api.dashboards.get), breakdownDistrubitionData);
router.post('/distribution/breakdown/users/search', authorize(Permissions.api.dashboards.get), breakdownDistrubitionUsersSearch);
router.post('/distribution/users/profile', authorize(Permissions.api.dashboards.get), userProfile);

module.exports = router;

async function userProfile(req, res, next) {
    data = req.body
    dashboardService.getUserProfile(req.user, data.user_id)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function progressDistrubitionData(req, res, next) {
    data = req.body
    dashboardService.progressDistrubitionData(req.user, data.organizationId, data.programId, data.courseId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function findProgressDistrubitionCompletedUserData(req, res, next) {
    data = req.body
    dashboardService.findProgressDistrubitionCompletedUserData(req.user,data.organizationId, data.programId, data.courseId, data.offset, data.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function findProgressDistrubitionAttemptedUserData(req, res, next) {
    data = req.body
    dashboardService.findProgressDistrubitionAttemptedUserData(req.user, data.organizationId,data.programId, data.courseId, data.offset, data.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function findProgressDistrubitionNotAttemptedUserData(req, res, next) {
    data = req.body
    dashboardService.findProgressDistrubitionNotAttemptedUserData(req.user, data.organizationId, data.programId, data.courseId, data.offset, data.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function breakdownDistrubitionData(req, res, next) {
    data = req.body
    dashboardService.breakdownDistrubitionData(req.user, data.programId, data.courseId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function breakdownDistrubitionUsersSearch(req, res, next) {
    data = req.body
    dashboardService.breakdownDistrubitionUsersSearch(req.user, data.programId, data.courseId, data.minAnswers, data.maxAnswers, data.offset, data.pageSize)
        .then(data => res.json(data))
        .catch(err => next(err));
}
