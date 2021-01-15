const express = require('express');
const router = express.Router();
const activityService = require('./activity.service');
const authorize = require('helpers/authorize')

const converter = require("helpers/converter");
const {v4: uuidv4} = require('uuid');
const {Storage} = require('@google-cloud/storage');
var cloudStorage = new Storage();
var bucket = process.env.STORAGE_BUCKET;
const Permissions = require("permissions/permissions")

// routes
 
router.post('/', authorize(Permissions.api.activities.create), create);
router.post('/log', authorize(Permissions.api.activities.create), logActivity);
router.put('/log', authorize(Permissions.api.activities.update), updateLogActivity);
router.get('/log/:id', authorize(Permissions.api.activities.get), getLogActivityById);
router.put('/log/:id/status', authorize(Permissions.api.activities.update), updateLogActivityStatus);
router.put('/', authorize(Permissions.api.activities.update), update);
router.get('/', authorize(Permissions.api.activities.get), getAll);
router.get('/types', authorize(Permissions.api.activities.get), getActivityTypes);
router.get('/participation-levels', authorize(Permissions.api.activities.get), getParticipationLevels);
router.get('/byLearner', authorize(Permissions.api.activities.get), getAllByLearner);

router.put('/:id/status', authorize(Permissions.api.activities.update), updateStatus);
router.get('/:id', authorize(Permissions.api.activities.get), getById);

router.get('/:id/replies', authorize(Permissions.api.activities.get), getReplies);
router.post('/reply', authorize(Permissions.api.activities.create), addReply);
router.put('/reply/:id', authorize(Permissions.api.activities.update), updateReply);
router.delete('/reply/:id', authorize(Permissions.api.activities.delete), deleteReply);

router.get('/:id/log-activity/replies', authorize(Permissions.api.activities.get), getLogActivityReplies);
router.post('/log-activity/reply', authorize(Permissions.api.activities.create), addLogActivityReply);
router.put('/log-activity/reply/:id', authorize(Permissions.api.activities.update), updateLogActivityReply);
router.delete('/log-activity/reply/:id', authorize(Permissions.api.activities.delete), deleteLogActivityReply);

router.post('/addActivityFile', authorize(Permissions.api.activities.create), addActivityFile);
router.delete('/deleteActivityFile/:id', authorize(Permissions.api.activities.delete), deleteActivityFile);
router.get('/downloadActivityFile/:id', authorize(Permissions.api.activities.get), downloadActivityFile);

router.post('/addLogActivityFile', authorize(Permissions.api.activities.create), addLogActivityFile);
router.delete('/deleteLogActivityFile/:id', authorize(Permissions.api.activities.delete), deleteLogActivityFile);
router.get('/downloadLogActivityFile/:id', authorize(Permissions.api.activities.get), downloadLogActivityFile);

router.post('/addActivityLink', authorize(Permissions.api.activities.create), addActivityLink);
router.delete('/deleteActivityLink/:id', authorize(Permissions.api.activities.delete), deleteActivityLink);

router.post('/addLogActivityLink', authorize(Permissions.api.activities.create), addLogActivityLink);
router.delete('/deleteLogActivityLink/:id', authorize(Permissions.api.activities.delete), deleteLogActivityLink);

router.post('/evaluate/:id', authorize(Permissions.api.activities.create), evaluate);

router.get('/allFiles/:id', authorize(), getAllFiles);
router.post('/upload/:id', authorize(), uploadFileToCloud);

module.exports = router;

function getAll(req, res, next) {
    activityService.getAll(req.user, req.query.from, req.query.to, req.query.selectedOrganizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getActivityTypes(req, res, next) {
    activityService.getActivityTypes(req.user, req.query.selectedOrganizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getById(req, res, next) {
    activityService.getById(req.params.id, req.user, req.query.selectedOrganizationId)
        .then(event => event ? res.json(event) : res.status(404).json({message: "Activity not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    activityService.create(req.body, req.user)
        .then((activity) => res.json(activity))
        .catch(err => next(err));
}

function update(req, res, next) {
    activityService.update(req.body, req.user)
        .then((activity) => res.json(activity))
        .catch(err => next(err));
}

function updateStatus(req, res, next) {
    activityService.updateStatus(req.params.id, req.body, req.user, req.query.filterOrganizationId)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function logActivity(req, res, next) {
    activityService.logActivity(req.body, req.user)
        .then((activity) => res.json(activity))
        .catch(err => next(err));
}


function updateLogActivity(req, res, next) {
    activityService.updateLogActivity(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function getParticipationLevels(req, res, next) {
    activityService.getParticipationLevels( req.user)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getLogActivityById(req, res, next) {
    activityService.getLogActivityById(req.params.id, req.user)
        .then(event => event ? res.json(event) : res.status(404).json({message: "Activity not found"}))
        .catch(err => next(err));
}

function updateLogActivityStatus(req, res, next) {
    console.log("Update log activity status:", req.params.id, req.body, req.user)
    activityService.updateLogActivityStatus(req.params.id, req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function getReplies(req, res, next) {
    activityService.getReplies(req.params.id, req.user , req.query.organizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function addReply(req, res, next) {
    activityService.addReply(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function updateReply(req, res, next) {
    activityService.updateReply(req.params.id, req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteReply(req, res, next) {
    //console.log("Got to delete reply:", req.params.id, req.user)
    activityService.deleteReply(req.params.id, req.user)
        .then(() => res.json(true))
        .catch(next);
}

async function addActivityFile(req, res, next)  {
    activityService.addActivityFile(req.user, req.body, req.query.organizationId)
    .then(data => {res.json(data)})
    .catch(err => next(err));
}

async function deleteActivityFile(req, res, next)  {
    console.log('deleteActivityFile', req.params.id);
    activityService.deleteActivityFile(req.user, req.params.id)
    .then(data => res.json(data));
}

async function downloadActivityFile(req, res, next)  {
    console.log('downloadActivityFile', req.params.id);
    activityService.downloadActivityFile(req.user, req.params.id, req.query.organizationId)
    .then(data => { res.json(data) });
}

async function addLogActivityFile(req, res, next)  {
    activityService.addLogActivityFile(req.user, req.body, req.query.organizationId)
    .then(data => res.json(data));
}

async function deleteLogActivityFile(req, res, next)  {
    console.log('deleteActivityFile', req.params.id);
    activityService.deleteLogActivityFile(req.user, req.params.id)
        .then(data => res.json(data));
}

async function downloadLogActivityFile(req, res, next)  {
    console.log('downloadLogActivityFile', req.params.id);
    activityService.downloadLogActivityFile(req.user, req.params.id , req.query.organizationId)
        .then(data => {res.json(data)  });
}

async function addActivityLink(req, res, next)  {
    console.log('addActivityLink', req.body);
    activityService.addActivityLink(req.user, req.body)
        .then(data => res.json(data));
}

async function deleteActivityLink(req, res, next)  {
    console.log('deleteActivityLink', req.params.id);
    activityService.deleteActivityLink(req.user, req.params.id)
        .then(data => res.json(data));
}

async function addLogActivityLink(req, res, next)  {
    console.log('addLogActivityLink', req.body);
    activityService.addLogActivityLink(req.user, req.body)
        .then(data => res.json(data));
}

async function deleteLogActivityLink(req, res, next)  {
    console.log('deleteActivityLink', req.params.id);
    activityService.deleteLogActivityLink(req.user, req.params.id)
        .then(data => res.json(data));
}

function getLogActivityReplies(req, res, next) {
    activityService.getLogActivityReplies(req.params.id, req.user)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function addLogActivityReply(req, res, next) {
    activityService.addLogActivityReply(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function updateLogActivityReply(req, res, next) {
    activityService.updateLogActivityReply(req.params.id, req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteLogActivityReply(req, res, next) {
    activityService.deleteLogActivityReply(req.params.id, req.user)
        .then(() => res.json(true))
        .catch(next);
}

function evaluate(req, res, next) {
    activityService.evaluate(req.body, req.user , req.params.id)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function getAllByLearner(req, res, next) {
    activityService.getAllByLearner(req.user, req.query.userId , req.query.employeeId , req.query.organizationId)
        .then(events => res.json(events))
        .catch(err => next(err));
}

function getAllFiles(req, res, next) {
    activityService.getAllFiles(req.user, req.params.id)
        .then(files => res.json(files))
        .catch(err => next(err));
}

async function uploadFileToCloud(req, res, next)  {
    let contentPath = 'GlobalFolder' + req.params.id + '/' ;
    if (req.body.file) {
        let fileName = req.body.file;
        let cloudFileURL = await courseService.genetateCloudStorageUploadURL(contentPath, fileName)
        .then(data => res.json({ name : req.body.file , url : data}))
        .catch(err => next(err));
    }
}
