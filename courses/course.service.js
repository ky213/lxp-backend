const knex = require('../db');
const moment = require('moment');
const Role = require('helpers/role');
const fs = require('fs');
const path = require('path');
const {Storage} = require('@google-cloud/storage');
const dashboardService = require('../dashboard/dashboard.service.js');
const organizationService = require('../organizations/organization.service');

module.exports = {
    getAll,
    getById,
    create,
    update,
    addFile,
    deleteCourses,
    getAllJoinedCourses,
    requestToJoinCourse,
    genetateCloudStorageUploadURL
};

var Readable = require('stream').Readable;
var cloudStorage = new Storage();
var bucket = process.env.STORAGE_BUCKET;

async function genetateCloudStorageUploadURL(dirPath, filename) {

    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const [url] = await cloudStorage
        .bucket(bucket)
        .file(dirPath + filename)
        .getSignedUrl(options).catch((err)=>{
            console.log(err);
            throw err
        });

    console.log('Generated PUT signed URL:');
    console.log(url);

    return url;
}


function deleteFileFromCloudStorage(filePath) {

    let bucket = process.env.STORAGE_BUCKET;

    cloudStorage
        .bucket(bucket)
        .deleteFiles({directory: filePath}, (err) => {
            if (!err) {
                console.log("deleting files in path gs://", bucket + "/" + filePath);
            } else {
                console.log("error : " + err);
                throw err;
            }
        })
}

async function getAll(loggedInUser, selectedOrganizationId, programId, pageId, recordsPerPage, filter) {
    if (!loggedInUser) {
        return;
    }

    let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    console.log('=>', selectedOrganizationId, programId, pageId, recordsPerPage);

    let model = knex('courses')
        .join('programs', 'programs.program_id', 'courses.program_id')
        .where('courses.organization_id', organizationId);

    if (programId)
        model.andWhere('courses.program_id', programId);

    var totalNumberOfRecords = (await model.clone().count().first()).count;

    let offset = (pageId - 1) * recordsPerPage;

    var coursesIds = await model.clone()
        .orderBy('name', 'asc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'courses.course_id as courseId',
            'courses.name',
            'courses.description',
            'courses.image',
            'courses.starting_date as startingDate',
            'courses.period_days as periodDays',
            'courses.content_path as contentPath',
            'programs.program_id as programId',
            'programs.name as programName',
        ]);

        let tempCourse = coursesIds.map(async (course) => {
            let result = await dashboardService.progressDistrubitionData(loggedInUser, organizationId, programId, course.courseId);
            course.inProgress = (result && result.inProgress) > 0 ? true : false;
            course.NumofUsersInProgress = result.inProgress;
            return course;
        });

        let courses = await Promise.all(tempCourse);
   
        let totalNumber = knex.raw(
            " select count(*) as total_number_of_courses " +
            " from courses " + 
            " where courses.organization_id = ? " , organizationId);
             
        let totalNumberOfCourses = await totalNumber.then(f => {
            if (f.rows.length === 0) {
                    return 0;
                }    
                console.log(f.rows);   
                return f.rows[0].total_number_of_courses;
            }).catch(err => {
                console.log(err);
                throw err;
            });

    return {
        courses,
        totalNumberOfRecords,
        totalNumberOfCourses
    }
}

async function getById(loggedInUser, courseId, selectedOrganizationId) {
    if (!loggedInUser)
        return;

    return knex('courses')
        .join('programs', 'programs.program_id', 'courses.program_id')
        .where('courses.organization_id', loggedInUser.role == Role.SuperAdmin && selectedOrganizationId ? selectedOrganizationId : loggedInUser.organization)
        .andWhere('courses.course_id', courseId)
        .select([
            'courses.course_id as courseId',
            'courses.organization_id as organizationId',
            'courses.name as name',
            'courses.image',
            'courses.description as description',
            'courses.period_days as periodDays',
            'courses.starting_date as startingDate',
            'courses.program_id as programId',
            'courses.content_path as contentPath',
            'programs.name as programName',
        ])
        .limit(1)
        .first();
}

async function addFile(loggedInUser, data) {
    return await knex('announcement_files')
        .insert({
            announcement_id: data.announcementId,
            file: Buffer.from(data.file),
            name: data.name,
            type: data.type,
            extension: data.extension,
            size: data.size
        })
        .returning('announcement_file_id');
};


async function getByUser(loggedInUser, includeRead, selectedOrganizationId) {

    if (!loggedInUser || !loggedInUser.employeeId)
        return;

    let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    return knex('courses')
        .where('course_id', courseId);
}

async function create(loggedInUser, selectedOrganizationId, programId, name, description, periodDays, startingDate, logo, contentPath) {
    if (!loggedInUser)
        return;

    let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    return knex("courses")
        .insert({
            organization_id: organizationId,
            program_id: programId,
            name: name,
            description: description,
            content_path: contentPath,
            image: logo,
            period_days: periodDays,
            starting_date: startingDate && moment(startingDate).format() || null,
            generated: knex.fn.now()
        });
}

async function update(loggedInUser, selectedOrganizationId, courseId, programId, name, description, periodDays, startingDate, logo) {
    if (!loggedInUser)
        return;

    let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    return knex("courses")
        .where('course_id', courseId)
        .update({
            program_id: programId,
            name: name,
            description: description,
            image: logo,
            period_days: periodDays,
            starting_date: startingDate && moment(new Date(startingDate)).format() || null,
            generated: knex.fn.now()
        });
}

async function deleteCourses(loggedInUser, courseIds, selectedOrganizationId) {
    if (!loggedInUser)
        return;

    let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    let contentPaths = await knex('courses').whereIn("course_id", courseIds).select(['content_path as contentPath']);

    contentPaths.forEach(p => deleteFileFromCloudStorage(p.contentPath));

    return knex("courses")
        .whereIn("course_id", courseIds)
        .del()
        .catch(error => {
            const message = 'Can not delete a course with joined learners' ;
            let errorObj = {isValid: false, status: "error", code: error.code, message : message};
            throw new Error(message);
          });
}

async function getAllJoinedCourses(loggedInUser, selectedOrganizationId, programId, pageId, recordsPerPage, filter) {
    if (!loggedInUser) {
        return;
    }

    let organizationId = (loggedInUser.role == Role.SuperAdmin && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    console.log('getAllJoinedCourses =>  ', selectedOrganizationId, loggedInUser, pageId, recordsPerPage);

    let model = knex('courses')
        .join('user_courses', 'user_courses.course_id', 'courses.course_id')
        .join('programs', 'programs.program_id', 'courses.program_id')
        .where('courses.organization_id', organizationId)
        .andWhere('user_courses.user_id', loggedInUser.userId)
        .andWhere('user_courses.is_able_to_join', true);

    if (programId)
        model.andWhere('courses.program_id', programId);

    var totalNumberOfRecords = (await model.clone().count().first()).count;

    let offset = (pageId - 1) * recordsPerPage;

    var courses = await model.clone()
        .orderBy('name', 'asc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'courses.course_id as courseId',
            'courses.name',
            'courses.description',
            'courses.image',
            'courses.starting_date as startingDate',
            'courses.period_days as periodDays',
            'courses.content_path as contentPath',
            'user_courses.joining_date as JoiningDate',
            'programs.program_id as programId',
            'programs.name as programName',
        ]);

    return {
        courses,
        totalNumberOfRecords
    }
}

async function requestToJoinCourse(loggedInUser, courseId) {
    if (!loggedInUser)
        return;

    let course = await knex('user_courses')
        .insert({
            user_id: loggedInUser.userId,
            course_id: courseId,
            is_able_to_join: true,
            joining_date: knex.fn.now()
        });

    var email = {  CourseId : courseId,  organizationId: loggedInUser.organization , UserId : loggedInUser.userId };
    await organizationService.sendEmail(email, loggedInUser);  
    
    return course;
}
