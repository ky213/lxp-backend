const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const Permissions = require("permissions/permissions")

const {v4: uuidv4} = require('uuid');

// routes
router.get('/', authorize(Permissions.api.courses.get), getAll);
router.get('/getById', authorize(Permissions.api.courses.get), getById);
router.get('/getByUser', authorize(Permissions.api.courses.get), getByUser);
router.get('/allCourseUsers', authorize(Permissions.api.courses.get), getAllUsersRelatedToCourse);
router.get('/lesson', authorize(Permissions.api.lessons.get), getAllLessons);
router.get('/lesson/byId', authorize(Permissions.api.lessons.get), getLessonById);

router.post('/', authorize(Permissions.api.courses.create), create);
router.post('/joinCourse', authorize(Permissions.api.courses.get), requestToJoinCourse);
router.put('/', authorize(Permissions.api.courses.update), update);
router.post('/lesson', authorize(Permissions.api.lessons.create), createLesson);
router.put('/lesson', authorize(Permissions.api.lessons.update), updateLesson);

router.delete('/deleteCourses', authorize(Permissions.api.courses.delete), deleteCourses);
router.delete('/unjoinCourse', authorize(Permissions.api.courses.delete), unJoinCourse);
router.delete('/deleteLessons', authorize(Permissions.api.lessons.delete), deleteLessons);
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
    courseService.getByUser(req.user, req.query.organizationId,req.query.userId, req.query.offset, req.query.pageSize , req.query.status)
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

async function deleteCourses(req, res, next) {
    courseService.deleteCourses(req.user, req.body.courseIds, req.body.organizationId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function requestToJoinCourse(req, res, next) {
    courseService.requestToJoinCourse(req.user, req.query.organizationId , req.query.courseId)
        .then(data => { 
            if(data.isValid == true){
                courseService.sendEmailForCourse(req.user, req.query.courseId);
            }
            res.json(data);
        })
        .catch(err => next(err));
}

async function getAllUsersRelatedToCourse(req, res, next) {
    courseService.getAllUsersRelatedToCourse(req.user, req.query.organizationId, req.query.programId,
        req.query.courseId, req.query.offset, req.query.pageSize, req.query.status)
    .then(data => res.json(data))
    .catch(err => next(err));
}

async function unJoinCourse(req, res, next) {
    courseService.unJoinCourse(req.user, req.query.courseId,  req.body)
    .then(data => res.json(data))
    .catch(err => next(err));
}

async function deleteLessons(req, res, next) {
    courseService.deleteLessons(req.user , req.body.lessonsIds, req.body.organizationId)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function createLesson(req, res, next) {
    let contentPath = `${uuidv4()}/`;

    let cloudFileURL = ""
    if (req.body.tincan) {
        let fileName = req.body.tincan;
        cloudFileURL = await courseService.genetateCloudStorageUploadURL(contentPath, fileName);
    }

    courseService.createLesson(req.user, req.body.selectedOrganization, contentPath, req.body.courseId )
        .then(data => {
            var lessonId = 0;
            if(data)
                lessonId = data.lessonId[0];
            data = {
                uploadUrl: cloudFileURL
            };
            const timeoutObj = setTimeout(() => {
                console.log('timeout beyond time', lessonId);
                courseService.getMetaFileFromCloudStorage(contentPath,  lessonId);
              }, 40000);
            res.json(data);
        })
        .catch(err => next(err));
}

async function updateLesson(req, res, next) {

    let cloudFileURL = ""
    if (req.body.tincan) {
        let fileName = req.body.tincan;
        cloudFileURL = await courseService.genetateCloudStorageUploadURL(req.body.contentPath, fileName);
    }

    courseService.updateLesson(req.user, req.body.selectedOrganization, req.body.lessonId ,
        req.body.name, req.body.order ,  req.body.courseId)
        .then(data => {
            data = {
                uploadUrl: cloudFileURL
            };
            const timeoutObj = setTimeout(() => {
                console.log('timeout beyond time',);
                courseService.getMetaFileFromCloudStorage(req.body.contentPath,  req.body.lessonId);
              }, 30000);
            res.json(data);
        })
        .catch(err => next(err));
}

async function getAllLessons(req, res, next) {
    courseService.getAllLessons(req.user, req.query.organizationId, req.query.courseId, req.query.page, req.query.take, req.query.filter)
        .then(data => res.json(data))
        .catch(err => next(err));
}

async function getLessonById(req, res, next) {
    courseService.getLessonById(req.user, req.query.lessonId, req.query.organizationId)
        .then(data => res.json(data));
}
