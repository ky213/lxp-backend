const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const Role = require('helpers/role');

const {v4: uuidv4} = require('uuid');

// routes
router.get('/', authorize(), getAll);
router.get('/getById', authorize(), getById);
router.get('/getByUser', authorize(), getByUser);
router.get('/allCourseUsers', authorize(), getAllUsersRelatedToCourse);

router.post('/', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector, Role.CourseManager]), create);
router.post('/joinCourse', authorize(), requestToJoinCourse);
router.put('/', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector, Role.CourseManager]), update);

router.delete('/deleteCourses', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector, Role.CourseManager]), deleteCourses);
router.delete('/unjoinCourse', authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector , Role.CourseManager]), unJoinCourse);

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
    courseService.deleteCourses(req.user, req.body.courseIds, req.body.selectedOrganizationId)
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
