const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");
const Permissions = require("permissions/permissions")

const {v4: uuidv4} = require('uuid');
var AdmZip = require('adm-zip');
var fs = require('fs');

// routes
//router.get('/:id', authorize(), getById);
router.get('/', authorize(Permissions.api.courses.get), getAll);
router.get('/downloadFile/:id', authorize(Permissions.api.courses.get), downloadFile);

router.delete('/deleteCourses', authorize(Permissions.api.courses.delete), deleteCourses);
router.get('/getById', authorize(Permissions.api.courses.get), getById);
router.get('/getByUser', authorize(Permissions.api.courses.get), getByUser);
router.get('/getByUserAll', authorize(Permissions.api.courses.get), getByUserAll);
router.get('/allCourseUsers', authorize(Permissions.api.courses.get), getAllCourseUsers);

router.post('/', authorize(Permissions.api.courses.create), create);
router.put('/', authorize(Permissions.api.courses.update), update);
router.post('/uploadFile', authorize(Permissions.api.courses.create), uploadFile);
router.post('/joinCourse', authorize(Permissions.api.courses.create), requestToJoinCourse);
router.delete('/unjoinCourse', authorize(Permissions.api.courses.delete), unJoinCourse);

module.exports = router;

async function getAll(req, res, next) {
    courseService.getAll(req.user, req.query.organizationId, req.query.programId, req.query.page, req.query.take, req.query.filter)
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
        req.body.name, req.body.description, req.body.periodDays, req.body.startingDate,
        req.body.logo, contentPath, req.body.courseCode , req.body.competencyIds)
        .then(data => { 
            var courseId = 0;
            if(data)
                courseId = data.courseId[0];
            data = {
                uploadUrl: cloudFileURL
            };
            const timeoutObj = setTimeout(() => {
                console.log('timeout beyond time', courseId);
                courseService.getTinCanXMLFileFromCloudStorage(contentPath,  courseId);
              }, 40000);
            res.json(data);
        })
        .catch(err => next(err));
}

async function update(req, res, next) {

    let cloudFileURL = ""
    if (req.body.tincan) {
        let fileName = req.body.tincan;
        cloudFileURL = await courseService.genetateCloudStorageUploadURL(req.body.contentPath, fileName);
    }

    courseService.update(req.user, req.body.selectedOrganization, req.body.courseId, req.body.programId,
        req.body.name, req.body.description, req.body.periodDays, req.body.startingDate, req.body.logo, 
        req.body.courseCode, req.body.competencyIds)
        .then(data => {
            data = {
                uploadUrl: cloudFileURL
            };
            const timeoutObj = setTimeout(() => {
                console.log('timeout beyond time',);
                courseService.getTinCanXMLFileFromCloudStorage(req.body.contentPath,  req.body.courseId);
              }, 30000);
            res.json(data);
        })
        .catch(err => next(err));
}

async function downloadFile(req, res, next) {
    console.log('downloadFile', req.params.id);
    courseService.downloadFile(req.user, req.params.id)
        .then(data => {
            res.json({...data, file: converter.ConvertImageBufferToBase64(data.file)})
        });
}

async function deleteCourses(req, res, next) {
    courseService.deleteCourses(req.user, req.body.courseIds, req.body.selectedOrganizationId)
        .then(data => res.json(data))
        .catch(err => next(err));
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
        .then(data => { 
            if(data.isValid == true){
                courseService.sendEmailForCourse(req.user, req.query.courseId);
            }
            res.json(data);
        })
        .catch(err => next(err));
}

async function getAllCourseUsers(req, res, next) {
    courseService.getAllCourseUsers(req.user, req.query.organizationId, req.query.programId, 
        req.query.courseId, req.query.offset, req.query.pageSize, req.query.status)
    .then(data => res.json(data))
    .catch(err => next(err));
}

async function unJoinCourse(req, res, next) {
    courseService.unJoinCourse(req.user, req.query.courseId,  req.body)
    .then(data => res.json(data))
    .catch(err => next(err));
}
