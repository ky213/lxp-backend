const express = require('express');
const router = express.Router();
const activityService = require('./activity.service');
const courseService = require('../courses/course.service');
const authorize = require('helpers/authorize')
const Role = require('helpers/role');
const converter = require("helpers/converter");
const {v4: uuidv4} = require('uuid');
const {Storage} = require('@google-cloud/storage');
var cloudStorage = new Storage();
var bucket = process.env.STORAGE_BUCKET;

// routes
 
router.post('/', authorize(), create); 
router.post('/log', authorize(), logActivity); 
router.put('/log', authorize(), updateLogActivity); 
router.get('/log/:id', authorize(), getLogActivityById);  
router.put('/log/:id/status', authorize(), updateLogActivityStatus); 
router.put('/', authorize(), update); 
router.get('/', authorize(), getAll); 
router.get('/types', authorize(), getActivityTypes);  
router.get('/participation-levels', authorize(), getParticipationLevels);  
router.get('/byLearner', authorize(), getAllByLearner); 

router.put('/:id/status', authorize(), updateStatus); 
router.get('/:id', authorize(), getById);  

router.get('/:id/replies', authorize(), getReplies);  
router.post('/reply', authorize(), addReply);
router.put('/reply/:id', authorize(), updateReply);
router.delete('/reply/:id', authorize(), deleteReply);

router.get('/:id/log-activity/replies', authorize(), getLogActivityReplies);  
router.post('/log-activity/reply', authorize(), addLogActivityReply);
router.put('/log-activity/reply/:id', authorize(), updateLogActivityReply);
router.delete('/log-activity/reply/:id', authorize(), deleteLogActivityReply);

router.post('/addActivityFile', authorize(), addActivityFile);
router.delete('/deleteActivityFile/:id', authorize(), deleteActivityFile);
router.get('/downloadActivityFile/:id', authorize(), downloadActivityFile);

router.post('/addLogActivityFile', authorize(), addLogActivityFile);
router.delete('/deleteLogActivityFile/:id', authorize(), deleteLogActivityFile);
router.get('/downloadLogActivityFile/:id', authorize(), downloadLogActivityFile);

router.post('/addActivityLink', authorize(), addActivityLink);
router.delete('/deleteActivityLink/:id', authorize(), deleteActivityLink);

router.post('/addLogActivityLink', authorize(), addLogActivityLink);
router.delete('/deleteLogActivityLink/:id', authorize(), deleteLogActivityLink);

router.post('/evaluate/:id', authorize(), evaluate);

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
    activityService.getReplies(req.params.id, req.user)
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
    activityService.addActivityFile(req.user, req.body)
    .then(data => {
        if(data && data.ContentPath) {

            const type = req.body.type;
            const buckets =  cloudStorage.bucket(bucket);
            const blob = buckets.file(data.ContentPath);

            const stream = blob.createWriteStream({
                resumable: true,
                contentType: type,
                predefinedAcl: 'publicRead',
            });

            stream.on('error', err => {
                next(err);
            });

            stream.on('finish', () => {
                res.status(200).json({
                    data: {
                        url: `https://storage.googleapis.com/${buckets.name}/${blob.name}`,
                    },
                });
            });

            stream.end(Buffer.from(req.body.file));
        }

        res.json(data);
    });
}

async function deleteActivityFile(req, res, next)  {
    console.log('deleteActivityFile', req.params.id);
    activityService.deleteActivityFile(req.user, req.params.id)
        .then(data => res.json(data));
}

async function downloadActivityFile(req, res, next)  {
    console.log('downloadActivityFile', req.params.id);
    activityService.downloadActivityFile(req.user, req.params.id)
        .then(data => {
            res.json({...data, file: converter.ConvertImageBufferToBase64(data.file)})        
        });
}

async function addLogActivityFile(req, res, next)  {
    console.log('addLogActivityFile', req.body);
    activityService.addLogActivityFile(req.user, req.body)
        .then(data => res.json(data));
}

async function deleteLogActivityFile(req, res, next)  {
    console.log('deleteActivityFile', req.params.id);
    activityService.deleteLogActivityFile(req.user, req.params.id)
        .then(data => res.json(data));
}

async function downloadLogActivityFile(req, res, next)  {
    console.log('downloadLogActivityFile', req.params.id);
    activityService.downloadLogActivityFile(req.user, req.params.id)
        .then(data => {
            res.json({...data, file: converter.ConvertImageBufferToBase64(data.file)})        
        });
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
    //console.log("Got to delete reply:", req.params.id, req.user)
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

function getAllFiles(req, res, next) {console.log('getAllActivityFiles => ' );
    activityService.getAllFiles(req.user, req.params.id)
        .then(files => res.json(files))
        .catch(err => next(err));
}

async function uploadFileToCloud(req, res, next)  {
    let contentPath = 'GlobalFolder' + req.params.id + '/' ;
    let cloudFileURL = ""
    if (req.body.file) {
        let fileName = req.body.file;
        cloudFileURL = await courseService.genetateCloudStorageUploadURL(contentPath, fileName)
        .then(data => res.json({ name : req.body.file , url : data}))
        .catch(err => next(err));
    }
}