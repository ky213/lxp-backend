const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");

const {v4: uuidv4} = require('uuid');
var AdmZip = require('adm-zip');
var fs = require('fs');

// routes
router.get('/:id', authorize(), getById);
router.get('/', authorize(), getAll);
router.get('/downloadFile/:id', authorize(), downloadFile);

router.delete('/deleteCourses', authorize(), deleteCourses);
router.get('/getById', authorize(), getById);
router.get('/getAll', authorize(), getAll);
router.get('/getByUser', authorize(), getByUser);
router.get('/getByUserAll', authorize(), getByUserAll);
router.get('/getAllJoined', authorize(), getAllJoinedCourses);

router.post('/', authorize(), create);
router.put('/', authorize(), update);
router.post('/uploadFile', authorize(), uploadFile);
router.post('/joinCourse', authorize(), requestToJoinCourse);

module.exports = router;

async function getAll(req, res, next) {
    courseService.getAll(req.user, req.query.organizationId, req.query.programId, req.query.page, req.query.take, req.query.filter)
        .then(data => res.json(data))
        .catch(err => next(err));
}

function getAllJoinedCourses(req, res, next) {
    courseService.getAllJoinedCourses(req.user, req.query.organizationId, req.query.programId, req.query.page, req.query.take, req.query.filter)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function getById(req, res, next) {
    courseService.getById(req.user, req.query.courseId, req.query.organizationId)
        .then(data => res.json(data));
}

async function getByUser(req, res, next) {
    //console.log('getByUser', req.user);
    courseService.getByUser(req.user, false, req.query.organizationId)
        .then(data => res.json(data));
}

async function getByUserAll(req, res, next) {
    //console.log('getByUser', req.user);
    courseService.getByUser(req.user, true, req.query.organizationId)
        .then(data => res.json(data));
}

async function create(req, res, next) {
    let contentPath = `${uuidv4()}/`;

    let cloudFileURL = ""
    if (req.body.tincan) {
        let fileName = req.body.tincan;
        cloudFileURL = await courseService.genetateCloudStorageUploadURL(contentPath, fileName);
    }

    courseService.create(req.user, req.body.selectedOrganization, req.body.programId,
        req.body.name, req.body.description, req.body.periodDays, req.body.startingDate, req.body.logo, contentPath)
        .then(data => {
            data.uploadUrl = cloudFileURL;
            res.json(data);
        })
}

async function update(req, res) {

    let cloudFileURL = ""
    if (req.body.tincan) {
        let fileName = req.body.tincan;
        cloudFileURL = await courseService.genetateCloudStorageUploadURL(req.body.contentPath, fileName);
    }

    courseService.update(req.user, req.body.selectedOrganization, req.body.courseId, req.body.programId,
        req.body.name, req.body.description, req.body.periodDays, req.body.startingDate, req.body.logo)
        .then(data => {
            data = {
                uploadUrl: cloudFileURL,
            };
            res.json(data);
        })
}

async function downloadFile(req, res, next) {
    console.log('downloadFile', req.params.id);
    courseService.downloadFile(req.user, req.params.id)
        .then(data => {
            res.json({...data, file: converter.ConvertImageBufferToBase64(data.file)})
        });
}

async function deleteCourses(req, res, next) {
    console.log('deleteCourse', req.body);
    courseService.deleteCourses(req.user, req.body.courseIds, req.body.selectedOrganizationId)
        .then(data => res.json(data));
}

async function uploadFile(file, contentPath) {
    // console.log('uploadFile', req.files);
    // const file = req.files.file;
    const dir = `./upload${contentPath}`;
    var uploadPath = `${dir}tincan.zip`

    // deleteFolderContent(dir);
    fs.mkdirSync(dir, {recursive: true});

    file.mv(uploadPath, (error) => {
        if (error) {
            console.error(error)
            res.writeHead(500, {
                'Content-Type': 'application/json'
            })
            // res.end(JSON.stringify({ status: 'error', message: error }))

            return {status: 'error', message: error};
        }

        var zip = new AdmZip(uploadPath);
        zip.extractAllTo(dir, true);
        // res.writeHead(200, {
        //   'Content-Type': 'application/json'
        // })
        // res.end(JSON.stringify({ status: 'success', path: dir }))
        return {status: 'success'};
    })
}


async function requestToJoinCourse(req, res, next) {
    courseService.requestToJoinCourse(req.user, req.query.courseId)
        .then(data => res.json(data));
}