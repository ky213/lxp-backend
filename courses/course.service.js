const knex = require('../db');
const moment = require('moment');
const PermissionsService = require('permissions/permissions.service')
var xpath   = require('xpath');
var dom     = require('xmldom').DOMParser;
const {Storage} = require('@google-cloud/storage');
const organizationService = require('../organizations/organization.service');
var cloudStorage = new Storage();
var bucket = process.env.STORAGE_BUCKET;

module.exports = {
    getAll,
    getById,
    getByUser,
    create,
    update,
    deleteCourses,
    requestToJoinCourse,
    genetateCloudStorageUploadURL,
    sendEmailForCourse,
    getAllCoursesIds,
    checkIfCourseExists,
    getAllUsersRelatedToCourse,
    unJoinCourse,
    getTinCanXMLFileFromCloudStorage,
    getAllCoursesForUser
};

// Used in Learner Services to validate courses
async function getAllCoursesIds(organizationId) {

    let model = knex.table('courses')

    const courses = await model.clone()
        .orderBy('courses.name', 'asc')
        .where('courses.organization_id', organizationId)
        .select([
            'courses.course_id as courseId',
            'courses.name',
            'courses.course_code as courseCode'
        ]);

    return courses;
}

async function genetateCloudStorageUploadURL(dirPath, filename) {

    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const [url] = await cloudStorage
        .bucket(bucket)
        .file(dirPath + filename)
        .getSignedUrl(options).catch((error)=>{
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message }))
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
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: err.code, message :  err.message }))
            }
        })
}

//TODO: it is hard to understand what is going on in this function! We need to refactor it.
async function getAll(loggedInUser, selectedOrganizationId, programId, pageId, recordsPerPage, filter) {
    if (!loggedInUser) {
        return;
    }

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    console.log('=>', selectedOrganizationId, programId, pageId, recordsPerPage);

    let model = knex('courses')
        .join('programs', 'programs.program_id', 'courses.program_id')
        .where('courses.organization_id', organizationId);

    if (programId)
        model.andWhere('courses.program_id', programId);

    var totalNumberOfRecords = (await model.clone().count().first()).count;

    let offset = (pageId - 1) * recordsPerPage;

    //we read all the courses
    var coursesIds = await model.clone()
        .orderBy('course_code', 'asc')
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
            'courses.course_code as courseCode',
            'courses.activity_number as activityNumber',
            'programs.program_id as programId',
            'programs.name as programName'
        ]);

        const allCourseCompetencies = await knex.table('competencies_tags')
        .leftJoin('courses', 'competencies_tags.course_id' , 'courses.course_id')
        .leftJoin('competencies', 'competencies_tags.competency_id' , 'competencies.competency_id')
        .whereIn('courses.course_id', coursesIds.map(c => c.courseId))
        .select([
            'courses.course_id as courseId',
            'competencies.competency_id as competencyId',
            'competencies.code as competencyCode',
            'competencies.title as competencyTitle',
        ]);

        const allUserCourses = await knex.table('user_courses')
        .join('courses', 'courses.course_id', 'user_courses.course_id')
        .whereIn('user_courses.course_id', coursesIds.map(c => c.courseId))
        .select([
                'user_courses.course_id as courseId',
                'user_courses.user_id as userId',
                'user_courses.activity_numbers_completed as activityNumbersCompleted',
                'user_courses.is_completed as isCompleted'
        ]);

        let tempCourse = coursesIds.map(async (course) => {
            let allUsers = allUserCourses.filter(c => c.courseId == course.courseId);

            let progress = false;
            let progressCounter = 0;
            let completedCounter = 0;
            allUsers.forEach(user => {
                user.inProgress = user && user.isCompleted == false &&  user.activityNumbersCompleted > 0 ? true : false;
                progressCounter += user && user.isCompleted == false &&  user.activityNumbersCompleted > 0 ? 1 : 0;
                completedCounter += user && user.isCompleted == true  ? 1 : 0 ;
            })

            course.users = allUsers;
            course.inProgress = progress;
            course.NumofUsersInProgress = progressCounter;
            course.NumofUsersCompleted = completedCounter;

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

        //TODO:
        // all above code is because we want to return a structure as below:
        // [{
        //     competencyIds: {
        //         competencyId: d.competencyId,
        //         competencyCode: d.competencyCode,
        //         competencyTitle: d.competencyTitle
        //      }
        //   },{
        //     competencyIds: {
        //         competencyId: d.competencyId,
        //         competencyCode: d.competencyCode,
        //         competencyTitle: d.competencyTitle
        //      }
        // }]
        // we need make better use of SQL
        return {
            courses: courses.map(course => {
                return {
                    ...course,
                    competencyIds: allCourseCompetencies.filter(c => c.courseId == course.courseId).map(d => {
                        return {
                            competencyId: d.competencyId,
                            competencyCode: d.competencyCode,
                            competencyTitle: d.competencyTitle
                        }
                    }),
                }
            }),     
            totalNumberOfRecords,
            totalNumberOfCourses
        };     
}

async function getById(loggedInUser, courseId, selectedOrganizationId) {
    if (!loggedInUser)
        return;

    let selectCourse = knex.select([
        'courses.course_id as courseId',
        'courses.organization_id as organizationId',
        'courses.name as name',
        'courses.image',
        'courses.description as description',
        'courses.period_days as periodDays',
        'courses.starting_date as startingDate',
        'courses.program_id as programId',
        'courses.content_path as contentPath',
        'courses.course_code as courseCode',
        'courses.activity_number as activityNumber',
        'programs.name as programName'
    ])
    .from('courses')
    .join('programs', 'programs.program_id', 'courses.program_id');

    let courseData = await selectCourse
    .where('courses.organization_id', PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId ? selectedOrganizationId : loggedInUser.organization)
    .andWhere('courses.course_id', courseId)
    .limit(1)
    .first();

    if(courseData) {
        const competencies = await knex.table('competencies_tags')
            .leftJoin('courses', 'competencies_tags.course_id' , 'courses.course_id')
            .leftJoin('competencies', 'competencies_tags.competency_id' , 'competencies.competency_id')
            .andWhere('courses.course_id', courseId)
            .select([
                'competencies.competency_id as competencyId',
                'competencies.code as competencyCode', 
                'competencies.title as competencyTitle', 
             ]);

        courseData.competencyIds = competencies.map(d => ({
            competencyId: d.competencyId,
            competencyCode: d.competencyCode,
            competencyTitle: d.competencyTitle
        }));     
    }

    return courseData
}
//TODO: there should be a better way to implement this function
async function getByUser(loggedInUser, selectedOrganizationId , userId, offset, pageSize, status){
    if (!loggedInUser) {
        return;
    }

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    let model = knex('courses')
        .join('programs', 'programs.program_id', 'courses.program_id')
        .where('courses.organization_id', organizationId);

    var totalNumberOfCourses = (await model.clone().count().first()).count;

    var coursesIds = await model.clone()
        .orderBy('course_code', 'asc')
        .offset(offset)
        .limit(pageSize)
        .select([
            'courses.course_id as courseId',
            'courses.name',
            'courses.description',
            'courses.image',
            'courses.starting_date as startingDate',
            'courses.period_days as periodDays',
            'courses.content_path as contentPath',
            'courses.course_code as courseCode',
            'courses.activity_number as activityNumber',
            'programs.program_id as programId',
            'programs.name as programName'
        ]);

        const allCourseCompetencies = await knex.table('competencies_tags')
        .leftJoin('courses', 'competencies_tags.course_id' , 'courses.course_id')
        .leftJoin('competencies', 'competencies_tags.competency_id' , 'competencies.competency_id')
        .whereIn('courses.course_id', coursesIds.map(c => c.courseId))
        .select([
            'courses.course_id as courseId',
            'competencies.competency_id as competencyId',
            'competencies.code as competencyCode',
            'competencies.title as competencyTitle',
        ]);

        const allUserCourses = await knex.table('user_courses')
        .join('courses', 'courses.course_id', 'user_courses.course_id')
        .join('users', 'users.user_id', 'user_courses.user_id')
        .whereIn('user_courses.course_id', coursesIds.map(c => c.courseId))
        .andWhere('user_courses.user_id', userId)
        .select([
            'user_courses.course_id as courseId',
            'user_courses.joining_date as joiningDate',
            'user_courses.user_id as userId',
            'user_courses.activity_numbers_completed as activityCompleted',
            'user_courses.is_completed as isCompleted',
            'users.email',
            'users.name as firstName',
            'users.surname as lastName'
        ]);

        let tempCourse = coursesIds.map(async (course) => {
            let allUsers = allUserCourses.filter(c => c.courseId == course.courseId);
            let courseActivity = course.activityNumber;

            allUsers.forEach(user => {
                user.inProgress = user && user.isCompleted == false &&  user.activityCompleted > 0 ? true : false;

                let activiryNumber = user.activityCompleted;

                if(activiryNumber == 0 ||  activiryNumber == null ||  activiryNumber == undefined)
                        user.status = 'Not Started';
                else if(user.isCompleted == true)
                    user.status = 'Completed';
                else if(activiryNumber < courseActivity){
                    user.status = 'In Progress';
                    user.progress = activiryNumber / courseActivity;
                }
            })

            course.users = allUsers;

            return course;
        });

        let courses = await Promise.all(tempCourse);

        if(status)
        {
            courses.map(course => {
                course.users = course.users ? course.users.filter(user => user.status == status).map(user => user) : course.users ;
                return course;
            })

            courses = courses  ? courses.filter(d => d.users && d.users.length > 0 ) : courses;
        }

        return {
            courses: courses.map(course => {
                return {
                    ...course,
                    competencyIds: allCourseCompetencies.filter(c => c.courseId == course.courseId).map(d => {
                        return {
                            competencyId: d.competencyId,
                            competencyCode: d.competencyCode,
                            competencyTitle: d.competencyTitle
                        }
                    }),
                }
            }),
            totalNumberOfCourses,
            totalNumberOfRecords : courses.length
        };

}

async function create(loggedInUser, selectedOrganizationId, programId, name, description, periodDays, startingDate, logo, contentPath, courseCode , competencyIds) {
    if (!loggedInUser)
        return;

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    return knex.transaction(async function (t) {
        const courseId = await knex("courses")
        .insert({
            organization_id: organizationId,
            program_id: programId,
            name: name,
            description: description,
            content_path: contentPath,
            image: logo,
            period_days: periodDays,
            starting_date: startingDate && moment(startingDate).format() || null,
            generated: knex.fn.now(),
            generated_by_user : loggedInUser.employeeId || loggedInUser.sub,
            course_code:  courseCode
        })
        .returning('course_id')
        .catch(error => { 
            if (error && error.code == '23505')
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Course Code already taken, it should be unique' })) 
            else
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });  
            
        if (competencyIds) {
            const insertCompetencyIds = competencyIds.map(competency => {
                return {
                    course_id: courseId,
                    organization_id : organizationId,
                    competency_id: competency.competencyId
                }
            });
    
            await knex('competencies_tags').where('course_id', courseId).del().catch(error => console.log(error));
            await knex('competencies_tags')
            .insert(insertCompetencyIds)
            .catch(error => { 
                if (error && error.code == '23505')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each course' })) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
        }

        return { courseId }
    });       
}

async function update(loggedInUser, selectedOrganizationId, courseId, programId, name, description, periodDays, startingDate, logo, courseCode , competencyIds) {
    if (!loggedInUser)
        return;

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;
    
    return knex.transaction(async function (t) {
        await knex("courses")
        .where('course_id', courseId)
        .andWhere('organization_id' , organizationId)
        .update({
            program_id: programId,
            name: name,
            description: description,
            image: logo,
            period_days: periodDays,
            starting_date: startingDate && moment(new Date(startingDate)).format() || null,
            generated: knex.fn.now(),
            generated_by_user : loggedInUser.employeeId || loggedInUser.sub,
            course_code: courseCode
        })
        .catch(error => { 
            if (error && error.code == '23505')
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Course Code already taken, it should be unique' })) 
            else
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });

        if (competencyIds) {
            const insertCompetencyIds = competencyIds.map(competency => {
                return {
                    course_id: courseId,
                    organization_id : organizationId,
                    competency_id: competency.competencyId
                }
            });

            await knex('competencies_tags').where('course_id', courseId).del().catch(error => console.log(error));
            await knex('competencies_tags')
            .insert(insertCompetencyIds)
            .catch(error => { 
                if (error && error.code == '23505')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each course' })) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
        }

        return { courseId }
    });
}

async function deleteCourses(loggedInUser, courseIds, selectedOrganizationId) {
    if (!loggedInUser)
        return;

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    let contentPaths = await knex('courses').whereIn("course_id", courseIds).select(['content_path as contentPath']);

    contentPaths.forEach(p => deleteFileFromCloudStorage(p.contentPath));

    return knex("courses")
        .whereIn("course_id", courseIds)
        .andWhere('courses.organization_id',organizationId)
        .del()
        .catch(error => {
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'You can not delete a course with joined learners' }))
        });
}

async function requestToJoinCourse(loggedInUser, selectedOrganizationId, courseId) {
    if (!loggedInUser)
        return;

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    let selectCourse = knex.select(['courses.generated_by_user as generatedByUser'])
    .from('courses')

    let courseData = await selectCourse
    .where('courses.organization_id', organizationId)
    .andWhere('courses.course_id', courseId)
    .limit(1)
    .first();

    let generatedByUser = null;
    if(courseData)
        generatedByUser = courseData.generatedByUser;

    if (generatedByUser && (generatedByUser == ( loggedInUser.employeeId || loggedInUser.sub))){
        throw new Error(JSON.stringify({isValid: false, status: "error", code: 99 , message :  'You cannot join a course you created.'}));
    }
    else{
        await knex('user_courses')
        .insert({
            user_id: loggedInUser.userId,
            course_id: courseId,
            is_able_to_join: true,
            joining_date: knex.fn.now()
        })
        .catch(error => { return { isValid: false, status: "error", code: error.code, message: error } });

        return {isValid: true};
    }
}

async function sendEmailForCourse(loggedInUser, courseId) {
    var email = {  CourseId : courseId,  organizationId: loggedInUser.organization , UserId : loggedInUser.userId };
    await organizationService.sendEmail(email, loggedInUser);
}

// Used in Learner Services in add bulk method
async function checkIfCourseExists(courseId, userId) {
    let model = knex("user_courses")
      .where('user_courses.user_id', userId)
      .andWhere('user_courses.course_id', courseId);

    let x = await model.count().first();

    if (x.count === 0) return true;
    else return false;
}

async function getAllUsersRelatedToCourse(loggedInUser, selectedOrganizationId , programId, courseId, offset, pageSize, status){
    if (!loggedInUser)
        return;

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    let model = knex.table('user_courses')
    .join('users', 'users.user_id', 'user_courses.user_id')
    .join('courses', 'courses.course_id', 'user_courses.course_id')
    .where('user_courses.course_id', courseId)
    .andWhere('courses.organization_id', organizationId);

    var totalNumberOfRecords = (await model.clone().count().first()).count;

    const allUsersForCourse = await model.clone()
        .orderBy('users.name', 'asc')
        .offset(offset)
        .limit(pageSize)
        .select([
            'user_courses.course_id as courseId',
            'user_courses.joining_date as joiningDate',
            'user_courses.user_id as userId',
            'user_courses.activity_numbers_completed as activityCompleted',
            'user_courses.is_completed as isCompleted',
            'courses.activity_number as courseActivityNumbers',
            'users.email',
            'users.name', 
            'users.name as firstName',
            'users.surname as lastName'
        ])
        .catch( error => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message}))});

        let courseActivity = 0;
        if(allUsersForCourse && allUsersForCourse.length > 0)
            courseActivity = allUsersForCourse[0].courseActivityNumbers;

        let tempCourse = allUsersForCourse.map(async (user) => {
            let activiryNumber = user.activityCompleted;

            if(activiryNumber == 0 ||  activiryNumber == null ||  activiryNumber == undefined)
                    user.status = 'Not Started';
            else if(user.isCompleted == true)
                user.status = 'Completed';
            else if(activiryNumber < courseActivity)
                user.status = 'In Progress';
                
            return user;
        });

    let courseUsers = await Promise.all(tempCourse);          

    if(status)
    {
        courseUsers = courseUsers.filter(user => user.status == status).map(user => user);
    }

    return {
        courseUsers,
        totalNumberOfRecords
    }
        
}

async function unJoinCourse(loggedInUser, courseId, userIds) {
    if (!loggedInUser)
        return;

    console.log(userIds);
    await knex('user_courses')
        .whereIn("user_id", userIds)
        .andWhere("course_id", courseId)
        .del()
        .catch( error => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message}))}); 

    return {isValid: true};
}

async function getTinCanXMLFileFromCloudStorage(contentPath , courseId) {
    var activityCount = 0;

    console.log('contentPath => ' , contentPath);

    const chunks = []
    const fstream = cloudStorage
            .bucket(bucket)
            .file(contentPath + "tincan.xml")
            .createReadStream()
    for await (const chunk of fstream) {
        
        chunks.push(chunk);
    }

    bin = Buffer.concat(chunks).toString('utf8')
    var doc = new dom().parseFromString(bin);

    var result = xpath.evaluate("//*//*[local-name()='activity']", doc, null, xpath.XPathResult.ANY_TYPE, null);
    var node = result.iterateNext();

    while (node) {
        activityCount +=1;
        node = result.iterateNext();
    }

    console.log(" activityCount => ", activityCount);

    await knex("courses")
        .where('course_id', courseId)
        .update({
            activity_number: activityCount
        })
        .catch(error => { 
                throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
        });

    return {isValid: true};
}

// Used in Activity Services to return list of course ids for selected user
async function getAllCoursesForUser(loggedInUser, userId , selectedOrganizationId ){
    if (!loggedInUser)
        return;

    let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;

    let model = knex.table('user_courses')
    .join('users', 'users.user_id', 'user_courses.user_id')
    .join('courses', 'courses.course_id', 'user_courses.course_id')
    .where('user_courses.user_id', userId)
    .andWhere('courses.organization_id', organizationId);

    const courseUsers = await model.clone()
        .select([
            'user_courses.course_id as courseId'
        ])
        .catch( error => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message}))});

    return courseUsers;    
}
