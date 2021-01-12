const knex = require('../db'); 
const moment = require('moment');
require('moment-timezone');
const converter = require("helpers/converter");
const Role = require('helpers/role');
const notificationService = require('../notifications/notification.service');
const organizationService = require('../organizations/organization.service');
const programService = require('../programs/program.service');
const courseService = require('../courses/course.service');
const userService = require('../users/user.service');
const { RRule, RRuleSet, rrulestr } = require('rrule');
var _ = require('lodash');
const {v4: uuidv4} = require('uuid');
const {Storage} = require('@google-cloud/storage');
var cloudStorage = new Storage();
var bucket = process.env.STORAGE_BUCKET;

module.exports = {
    getAll,
    getById,
    create,
    update,
    updateStatus,
    getActivityTypes,
    logActivity,
    updateLogActivity,
    getParticipationLevels,
    getLogActivityById,
    updateLogActivityStatus,
    addReply,
    updateReply,
    deleteReply,
    getReplies,
    addActivityFile,
    deleteActivityFile,
    downloadActivityFile,
    addLogActivityFile,
    deleteLogActivityFile,
    downloadLogActivityFile,
    addLogActivityLink,
    addActivityLink,
    deleteLogActivityLink,
    deleteActivityLink,
    addLogActivityReply,
    updateLogActivityReply,
    deleteLogActivityReply,
    getLogActivityReplies,
    getActivityStatusIds,
    getActivityStatusDetails,
    evaluate,
    getAllByLearner,
    getAllFiles
};


function userHasAdminRole(user) {
    return user.role == Role.SuperAdmin || user.role == Role.LearningManager || user.role == Role.ProgramDirector  || user.role == Role.Admin;
}

async function getActivityTypes(user, selectedOrganizationId) {

    let model = knex.select([
            'activity_types.activity_type_id as activityTypeId', 
            'activity_types.name as activityTypeName', 
        ])
        .from('activity_types')

    model.andWhere('activity_types.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    return await model.orderBy('activity_type_id', 'asc');
}

async function getRepeatingActivities(user, programIds, courseIds, from, to, selectedOrganizationId) {

    let repeatingActivitiesModel = knex.select([
        'activities_repetitions.activity_id as activityId',
        'activities.program_id as programId', 
        'activities.name',
        'activities.start',             
        'activities.end',
        'activities.priority',
        'activities.activity_type_id',
        'activities.location',
        'activities.repeat',
        'activities.description',
        'activity_statuses.name as status',
        'activity_statuses.activity_status_id as statusId',
        'activities.assigned_by as assignedBy',
        'activities.total_points as totalPoints',
        'activities.is_public as isPublic',  
        knex.raw('? as source', ['assigned']),
        'activities_repetitions.rrule',
        'activity_courses.course_id as courseId'
    ])
    .from('activities_repetitions')
    .join('activities', 'activities_repetitions.activity_id', 'activities.activity_id')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .leftJoin('activity_courses', 'activity_courses.activity_id', 'activities.activity_id')
    .leftJoin('activity_participants', 'activity_participants.activity_id', 'activities.activity_id')
    .where('activity_statuses.activity_status_id', '<>', 3) // not deleted
    .andWhere('activities.repeat', true);

    if(!userHasAdminRole(user)) {
        repeatingActivitiesModel
        .andWhere(function() {
            this.whereIn('activities.program_id', programIds)
                .orWhereNull('activities.program_id')
        })
        .andWhere(function() {
            this.whereIn('activity_courses.course_id', courseIds ).orWhereNull('activity_courses.course_id')
        })
        .andWhere(function() {
            this.where('activity_participants.employee_id', user.employeeId ).orWhereNull('activity_participants.employee_id')
        }); 
    }

    repeatingActivitiesModel.andWhere('activities.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    const repeatingActivities = await repeatingActivitiesModel;
    console.log('repeatingActivities => ' , repeatingActivities);
    let generatedActivities = [];
    
    for(let i = 0; i < repeatingActivities.length; i++) {
        const ra = repeatingActivities[i];
        if(ra) {

            const dtStart = moment(ra.start, 'DDMMYYYY').startOf('day').utc().format("YYYYMMDDTHHmmss");
            const parsed = rrulestr("DTSTART:"+ dtStart  +"\n" + ra.rrule);

            const parsedDates = parsed.between(moment(from, 'DDMMYYYY').startOf('day').utc().toDate(), moment(to, 'DDMMYYYY').utc().endOf('day').toDate());

            for(let j = 0; j < parsedDates.length; j++) {
                const date = parsedDates[j];
                
                const start = moment(moment(date).format('DDMMYYYY') + ' ' + moment(ra.start).format('HH:mm'), 'DDMMYYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss');
                const end = moment(moment(date).format('DDMMYYYY') + ' ' + moment(ra.end).format('HH:mm'), 'DDMMYYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss');
                console.log("Got parsed date => ", date , start , end)
                const act = {...ra, start, end};

                generatedActivities.push(act);
            }
        }
    }

    console.log("Generated repeating activities:", generatedActivities)
    
    return generatedActivities;
}

async function getRepeatActivities(user, programIds, courseIds, selectedOrganizationId) {

    let repeatingActivitiesModel = knex.select([
        'activities_repetitions.activity_id as activityId',
        'activities.program_id as programId', 
        'activities.name',
        'activities.start',             
        'activities.end',
        'activities.priority',
        'activities.activity_type_id',
        'activities.location',
        'activities.repeat',
        'activities.description',
        'activity_statuses.name as status',
        'activity_statuses.activity_status_id as statusId',
        'activities.assigned_by as assignedBy',
        'activities.total_points as totalPoints',
        'activities.is_public as isPublic',  
        knex.raw('? as source', ['assigned']),
        'activities_repetitions.rrule',
        'activity_types.name as activityTypeName'
    ])
    .from('activities_repetitions')
    .join('activities', 'activities_repetitions.activity_id', 'activities.activity_id')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .join('activity_types', 'activity_types.activity_type_id', 'activities.activity_type_id')
    .leftJoin('activity_courses', 'activity_courses.activity_id', 'activities.activity_id')
    .leftJoin('activity_participants', 'activity_participants.activity_id', 'activities.activity_id')
    .where('activities.repeat', true);

    if(!userHasAdminRole(user)) {
        repeatingActivitiesModel
        .andWhere(function() {
            this.whereIn('activities.program_id', programIds)
                .orWhereNull('activities.program_id')
        })
        .andWhere(function() {
            this.whereIn('activity_courses.course_id', courseIds ).orWhereNull('activity_courses.course_id')
        })
        .andWhere(function() {
            this.where('activity_participants.employee_id', user.employeeId ).orWhereNull('activity_participants.employee_id')
        }); 
    }

    repeatingActivitiesModel.andWhere('activities.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    const repeatingActivities = await repeatingActivitiesModel;  
    
    return repeatingActivities;
}

async function getAll(user, from, to, selectedOrganizationId) {

    const userPrograms = await programService.getByCurrentUser(user, user.role == Role.SuperAdmin ? selectedOrganizationId : user.organization);
    const programIds = userPrograms && userPrograms.map(p => p.programId) || null;

    const userCourses = await courseService.getAllUserCourses(user, user.userId,selectedOrganizationId);
    const courseIds = userCourses && userCourses.map(p => p.courseId) || null;

    var statusIds = await getActivityStatusIds();
    const deletedStatus = statusIds.filter(c => c.activityStatusName == 'Deleted').map(c =>  c.activityStatusId);

    console.log("Entered get activities:",  programIds  , courseIds)

    let model = knex.select([
        'activities.activity_id as activityId', 
        'activities.program_id as programId', 
        'activities.name',
        'activities.start',             
        'activities.end', 
        'activities.priority',
        'activities.activity_type_id',
        'activities.location',
        'activities.repeat',
        'activities.description',
        'activity_statuses.name as status',
        'activity_statuses.activity_status_id as statusId',
        'activities.assigned_by as assignedBy',
        'activities.total_points as totalPoints',
        'activities.is_public as isPublic',  
        knex.raw('? as source', ['assigned']),
        knex.raw('NULL as rrule'),
        'activity_courses.course_id as courseId'
    ])
    .from('activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .leftJoin('activity_courses', 'activity_courses.activity_id', 'activities.activity_id')
    .leftJoin('activity_participants', 'activity_participants.activity_id', 'activities.activity_id')
    .where('activity_statuses.activity_status_id', '<>', deletedStatus[0]) // not deleted
    .andWhere('activities.repeat', false)    
    .andWhereBetween('activities.start', [moment(from, 'DDMMYYYY').startOf('day').toDate(), moment(to, 'DDMMYYYY').endOf('day').toDate()])

    if(!userHasAdminRole(user)) {
        model
        .andWhere(function() {
            this.whereIn('activities.program_id', programIds)
                .orWhereNull('activities.program_id')
        })
        .andWhere(function() {
            this.whereIn('activity_courses.course_id', courseIds ).orWhereNull('activity_courses.course_id')
        })
        .andWhere(function() {
            this.where('activity_participants.employee_id', user.employeeId ).orWhereNull('activity_participants.employee_id')
        });   
        
    }
    
    let logModel = knex.select([
        'log_activities.log_activity_id as activityId', 
        'log_activities.program_id as programId', 
        'log_activities.name',
        'log_activities.start',             
        'log_activities.end', 
        knex.raw('? as priority', ['1']),
        'log_activities.activity_type_id',
        'log_activities.location',
        knex.raw('? as repeat', [false]),
        'log_activities.details as description',
        'activity_statuses.name as status',
        'activity_statuses.activity_status_id as statusId',
        'log_activities.logged_by as assignedBy',
        knex.raw('? as totalPoints', ['0']),
        'log_activities.is_public as isPublic',  
        knex.raw('? as source', ['logged']),
        knex.raw('NULL as rrule'),
        knex.raw('NULL as courseId')
    ])
    .from('log_activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'log_activities.status')
    .where('activity_statuses.activity_status_id', '<>', 3) // not deleted
    .andWhereBetween('log_activities.start', [moment(from, 'DDMMYYYY').startOf('day').toDate(), moment(to, 'DDMMYYYY').endOf('day').toDate()]);
    
    if(userHasAdminRole(user)) {
        logModel.andWhere('log_activities.is_public', true)
    }

    if(!userHasAdminRole(user)) {
        logModel
        .andWhere(function() {
            this.whereIn('log_activities.program_id', programIds)
            .orWhereNull('log_activities.program_id')
            .orWhereIn('log_activities.log_activity_id', function() {
                this.select('log_activity_id').from('log_activity_supervisors').where('employee_id', user.employeeId);
            })
        })
        .andWhere(function() {
            this.where('logged_by', user.employeeId)
                .orWhereIn('log_activities.log_activity_id', function() {
                    this.select('log_activity_id').from('log_activity_supervisors').where('employee_id', user.employeeId);
                })
                .orWhereIn('log_activities.program_id', function() {
                    this.select('program_id').from('program_directors').where('employee_id', user.employeeId);
                })
        });
    }
   
    model.andWhere('activities.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    logModel.whereIn('log_activities.program_id', function() {
        this.select('program_id').from('programs').where('organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);
    });


    let repeatingActivities = [];
    if(from && to) {
        repeatingActivities = await getRepeatingActivities(user, programIds, courseIds, from, to, selectedOrganizationId);
    }

    const activities = await knex.unionAll(model, true).unionAll(logModel, true);

    var returnedActivities = activities.concat(repeatingActivities);
    returnedActivities = returnedActivities.filter(x => x.statusId !== deletedStatus[0]);

    return returnedActivities;
}

async function getById(activityId, user, selectedOrganizationId) {
    let activityDetailsModel = knex.select([
        'activities.activity_id as activityId', 
        'activities.program_id as programId', 
        'activities.name',
        'activities.start',             
        'activities.end', 
        'activities.priority',
        'activities.activity_type_id as activityTypeId',
        'activities.location',
        'activities.repeat',
        'activities.description',
        'activity_statuses.activity_status_id as statusId',
        'activity_statuses.name as status',
        'activities.assigned_by as assignedBy',
        'activities.exp_level_id as level',
        'activities.total_points as totalPoints',
        'activities.is_public as isPublic',  
        'activities_repetitions.rrule',
        'users.name as assignedByFirstName',
        'users.surname as assignedByLastName'
    ])
    .from('activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .leftJoin('employees', 'activities.assigned_by', 'employees.employee_id')
    .leftJoin('users', 'users.user_id', 'employees.user_id')
    .leftJoin('activities_repetitions', 'activities_repetitions.activity_id', 'activities.activity_id')
    .where('activities.activity_id', activityId)
    .limit(1)
    .first();

    let organizationId = user.role == Role.SuperAdmin && selectedOrganizationId ? selectedOrganizationId : user.organization;
    if(user.role == Role.SuperAdmin && selectedOrganizationId) {
        activityDetailsModel.andWhere('activities.organization_id', selectedOrganizationId);
    }
    else {
        activityDetailsModel.andWhere('activities.organization_id', user.organization);
    }

    activityDetails = await activityDetailsModel;

    if(activityDetails) {

        if(!activityDetails.assignedByFirstName && !activityDetails.assignedByLastName && activityDetails.assignedBy) {
            const adminUser = await knex.select([
                'users.name as firstName', 
                'users.surname as lastName',             
            ])
            .from('users')
            .where('users.user_id', activityDetails.assignedBy).limit(1).first();

            if(adminUser) {
                activityDetails.assignedByFirstName = adminUser.firstName;
                activityDetails.assignedByLastName = adminUser.lastName;
            }
        }

        const participants = await knex.select([
            'activity_participants.activity_id as activityId', 
            'users.name as firstName', 
            'users.surname as lastName',
            'employees.employee_id as employeeId',             
        ])
        .from('activity_participants')
        .join('employees', 'employees.employee_id', 'activity_participants.employee_id')
        .join('users', 'users.user_id', 'employees.user_id')
        .where('activity_participants.activity_id', activityId);

        if(participants && participants.length > 0) {
            activityDetails.participants = participants.map(p => {
                return {
                    employeeId: p.employeeId,
                    name: `${p.firstName} ${p.lastName}`
                }
            });
        }
        else {
            activityDetails.participants = [];
        }

        activityDetails.courses = await knex.select([
            'courses.name as name', 
            'activity_courses.course_id as courseId',             
        ])
        .from('activity_courses')
        .join('courses', 'courses.course_id', 'activity_courses.course_id')
        .where('activity_courses.activity_id', activityId);
     
        activityDetails.replies = await getReplies(activityId, user , organizationId);
        activityDetails.files = await knex("activities_files")
            .where("activity_id", activityId)
            .andWhere("activity_reply_id" , null)
            .select([
            "activities_files.name",
            "activities_files.size",
            "activities_files.file",
            "activities_files.activity_file_id as activityFileId"
            ]);

        let assetsDomain = await getOrganizationAssetsDomain(organizationId);      
        activityDetails.files.map(file => {
            file.url = `${assetsDomain}/${file.file}${file.name}`;            
            return file;
        });    

        activityDetails.links = await knex("activities_links")
            .where("activity_id", activityId)
            .andWhere("activity_reply_id" , null)
            .select([
                "activities_links.url",
                "activities_links.activity_link_id as activityLinkId"
            ]);
        
        const competencies = await knex.table('competencies_tags')
            .leftJoin('activities', 'competencies_tags.activity_id' , 'activities.activity_id')
            .leftJoin('competencies', 'competencies_tags.competency_id' , 'competencies.competency_id')
            .andWhere('activities.activity_id', activityId)
            .select([
                'competencies.competency_id as competencyId',
                'competencies.code as competencyCode', 
                'competencies.title as competencyTitle', 
             ]);

        activityDetails.competencyIds = competencies.map(d => ({
            competencyId: d.competencyId,
            competencyCode: d.competencyCode,
            competencyTitle: d.competencyTitle
        }));      
    }

    return activityDetails;
}

async function getExistingActivities(activity, user) {
    console.log("Activity start/end", activity )
    const userPrograms = await programService.getByCurrentUser(user, user.role == Role.SuperAdmin ? activity.organizationId : user.organization);
    const programIds = userPrograms && userPrograms.map(p => p.programId) || null;

    const userCourses = await courseService.getAllUserCourses(user, user.userId, user.role == Role.SuperAdmin ? activity.organizationId : user.organization);
    const courseIds = userCourses && userCourses.map(p => p.courseId) || null;

    let existingActivitiesModel =  knex.select([
        'activities.activity_id as activityId', 
        'activities.program_id as programId', 
        'activities.name',
        'activities.start',             
        'activities.end', 
        'activities.priority',
        'activities.total_points as totalPoints',
        'activities.is_public as isPublic',  
        'activities.assigned_by as assignedBy'
    ])
    .from('activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .where('activity_statuses.activity_status_id', '<>', 3) // not deleted
    .andWhere('activities.repeat', false)
    .andWhereBetween('activities.start', [moment(activity.start).toDate(), moment(activity.end).toDate()]);

    if(user.role != Role.SuperAdmin) {
        existingActivitiesModel.andWhere(function() {
            this.whereIn('activities.program_id', programIds)
            .orWhereNull('activities.program_id')
        });
    }

    if(activity.activityId) {
        existingActivitiesModel.andWhere('activities.activity_id', '<>', activity.activityId);
    }

    if(user.role == Role.SuperAdmin && activity.organizationId) {
        existingActivitiesModel.andWhere('activities.organization_id', activity.organizationId);
    }
    else {
        existingActivitiesModel.andWhere('activities.organization_id', user.organization);
    }

    const existingActivities = await existingActivitiesModel;

    let repeatingActivities = [];
    try {
        repeatingActivities = await getRepeatingActivities(user, programIds, courseIds,
            moment(activity.start).format('DDMMYYYY'), moment(activity.end).format('DDMMYYYY'), activity.organizationId);
    }
    catch(exc) {
        console.log("Error while getting repeating activities: ", exc);
    }

    console.log("Return from calculate existing:", existingActivities, repeatingActivities, existingActivities.concat(repeatingActivities))
    return existingActivities.concat(repeatingActivities);
}

async function calculateStatus(activity, existingActivities, user) {
    const existingHasGreaterPriority = existingActivities && 
        existingActivities.length > 0 && existingActivities.filter(x => x.priority < activity.priority).length > 0 || false;
    
    //console.log("Existing activities with greater priority:", existingHasGreaterPriority)
    if(existingHasGreaterPriority) {
        return 1; // Pending
    }
    return 2; // Active
}

async function checkConflicts(activity, user) {
    console.log("Activity conflict start/end", activity )
    const userPrograms = await programService.getByCurrentUser(user, user.role == Role.SuperAdmin ? activity.organizationId : user.organization);
    const programIds = userPrograms && userPrograms.map(p => p.programId) || null;

    let existingActivities = [];
    try {
        let existingActivitiesModel = knex.select([
            'activities.activity_id as activityId', 
            'activities.program_id as programId', 
            'activities.name',
            'activities.start',             
            'activities.end', 
            'activities.priority',
            'activities.total_points as totalPoints',
            'activities.is_public as isPublic',  
            'activities.assigned_by as assignedBy'
        ])
        .from('activities')
        .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
        .where('activity_statuses.activity_status_id', '<>', 3) // not deleted
        .whereBetween('activities.start', [moment(activity.start).toDate(), moment(activity.end).toDate()]);

        if(user.role != Role.SuperAdmin) {
            existingActivitiesModel
            .where(function() {
                this.whereIn('activities.program_id', programIds)
                .orWhereNull('activities.program_id')
            })
            .whereIn('activities.activity_id', function() {
                this.select('activity_id').from('activity_participants').whereIn('employee_id', activity.participants.map(ap => ap.employeeId));
            });
        }


        if(activity.activityId) {
            existingActivitiesModel.andWhere('activities.activity_id', '<>', activity.activityId);
        }

        if(user.role == Role.SuperAdmin && activity.organizationId) {
            existingActivitiesModel.andWhere('activities.organization_id', activity.organizationId);
        }
        else {
            existingActivitiesModel.andWhere('activities.organization_id', user.organization);
        }

        existingActivities = await existingActivitiesModel;
    }
    catch(err) {
        console.log("Error while checking for conflicts:", err)
    }

    if(existingActivities && existingActivities.length > 0) {
        throw new Error("There are some activity conflicts for your activity partipants, please check their calendar and reschedule");
    }
}

async function create(activity, user) {
    return knex.transaction(async function(t) {
        let notifications = [];
        const existingActivities = await getExistingActivities(activity, user);
        const status = await calculateStatus(activity, existingActivities, user);
        console.log("Got existing activities and calculate status:", existingActivities, status)

        let warning = null;
        if(activity.activityTypeId != 11 && status == 2) {
            const updateActivities = existingActivities.map( (act) => act.activityId);

            await t('activities')
                .whereIn('activity_id', updateActivities)
                .update({status: 1 });

             existingActivities.map(act => {
                warning = `There is an existing activity (${activity.name}) that is happening at the same time as your (${act.name}) activity. Please reschedule it so that there are no conflicts, thank you.`
                notifications.push(notificationService.create({
                    notification: {
                        text: `There is an existing activity <strong>${activity.name}</strong> that has a higher priority happening at the same time as your <strong>${act.name}</strong> activity. Please reschedule it so that there are no conflicts, thank you.`,
                        notification_type_id: 2
                    }, 
                    userId: act.assignedBy,
                    employeeId: act.assignedBy,
                    transaction: t
                })); 
            });   
        }

        const activityId = await t('activities')
            .insert({
                program_id: activity.programId, 
                name: activity.name,
                start: activity.start,      
                end: activity.end,     
                priority: activity.priority,
                activity_type_id: activity.activityTypeId,
                location: activity.location,
                description: activity.description,
                assigned_by: user.employeeId || user.sub,
                status: activity.activityTypeId == 11 ? 1 : status,
                repeat: activity.repeat || false,
                total_points: activity.totalPoints,
                is_public : activity.isPublic,
                organization_id: activity.organizationId || user.organization,
                created_by: user.employeeId || user.sub,
                modified_by: user.employeeId || user.sub
            }).returning('activity_id');

        if (activity.competencyIds) {
                const insertCompetencyIds = activity.competencyIds.map(competency => {
                    return {
                        activity_id: activityId[0],
                        organization_id : activity.organizationId || user.organization,
                        competency_id: competency.competencyId
                    }
                });
        
                await t('competencies_tags').where('activity_id', activityId[0]).del().catch(error => console.log(error));
                await t('competencies_tags')
                .insert(insertCompetencyIds)
                .catch(error => { 
                    if (error && error.code == '23505')
                        throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each activity' })) 
                    else
                        throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
                });
        }    

        if(activity.repeat) {
            await t('activities_repetitions')
            .insert({rrule: activity.rrule, activity_id: activityId[0], created_by: user.employeeId  || user.sub, modified_by: user.employeeId  || user.sub});
        }

        const notificationMessage = `You have been assigned an activity
         <strong>${activity.name}</strong> that's starting at ${moment(activity.start).format('L')} and ending at ${moment(activity.end).format('L')}, 
         please take a look.`;

        if(activity.priority == 1) {
            const users = await knex('employee_programs')
                .join('employees', 'employees.employee_id', 'employee_programs.employee_id')
                .join('users', 'users.user_id', 'employees.user_id')
                .where('program_id', activity.programId)
                .andWhere('employees.is_learner', true)
                .andWhere('users.is_active', true)
                .select(['users.user_id']);
            
            users.map(user => {
                notifications.push(notificationService.create({
                    notification: {
                        text: notificationMessage,
                        notification_type_id: 2
                    }, 
                    userId: user.user_id,
                    transaction: t
                })); 
            });
        }

        if(activity.priority == 2 && activity.courses && activity.courses.length > 0) {

            let courseUsers = knex('employees')
            .join('users', 'users.user_id', 'employees.user_id')
            .where('employees.is_learner', true)
            .where('users.is_active', true)
            .whereIn('users.email', function() {
                this.select(knex.raw("replace(payload->'actor'->>'mbox', 'mailto:', '')")).from('statements');
                activity.courses.map(p => {
                    this.whereRaw(`payload->'context'->>'registration' like ?`, [`%|${p.courseId}%`]);
                });
            })

            const insertActivityCourses = activity.courses.map(p => {
                return {
                    activity_id: activityId[0],
                    course_id: p.courseId
                }
            });
        
            await t('activity_courses')
                .insert(insertActivityCourses);

            const users = await courseUsers.select(['users.user_id']);
            
            users.map(user => {
                notifications.push(notificationService.create({
                    notification: {
                        text: notificationMessage,
                        notification_type_id: 2
                    }, 
                    userId: user.user_id,
                    transaction: t
                })); 
            });
        }

        if(activity.priority == 3 && activity.participants && activity.participants.length > 0) {
            await checkConflicts(activity, user);
            const insertActivityParticipants = activity.participants.map(p => {
                return {
                    activity_id: activityId[0],
                    employee_id: p.employeeId
                }
            });
        
            await t('activity_participants')
                .insert(insertActivityParticipants);

            const users = await knex('employees')
                .join('users', 'users.user_id', 'employees.user_id')
                .whereIn('employees.employee_id', activity.participants.map(r => r.employeeId))
                .andWhere('users.is_active', true)
                .select(['users.user_id']);
            
            users.map(user => {
                notifications.push(notificationService.create({
                    notification: {
                        text: notificationMessage,
                        notification_type_id: 2
                    }, 
                    userId: user.user_id,
                    transaction: t
                })); 
            });
        }

        await Promise.all(notifications);
        return {...activity, warning, activityId};
    })
    .catch(err => {
        console.log('Create activity error:', err);
        throw err;
    });
}

async function update(activity, user) {
    return knex.transaction(async function(t) {
        let notifications = [];
        const existingActivities = await getExistingActivities(activity, user);
        const status = await calculateStatus(activity, existingActivities, user);
        console.log("Got existing activities and calculate status:", existingActivities, status)

        let warning = null;

        if(activity.activityTypeId != 11 && status == 2) {
            const updateActivities = existingActivities.map((act) => act.activityId).filter(ac => ac.activityId != activity.activityId);

            await knex('activities')
                .whereIn('activity_id', updateActivities)
                .transacting(t)
                .update({status: 1 });
            
            existingActivities.map(act => {
                warning = `There is an existing activity (${activity.name}) that is happening at the same time as your (${act.name}) activity. Please reschedule it so that there are no conflicts, thank you.`
                notifications.push(notificationService.create({
                    notification: {
                        text: `There is an existing activity <strong>${activity.name}</strong> that has a higher priority happening at the same time as your <strong>${act.name}</strong> activity. Please reschedule it so that there are no conflicts, thank you.`,
                        notification_type_id: 2
                    }, 
                    userId: act.assignedBy,
                    employeeId: act.assignedBy,
                    transaction: t
                })); 
            });
        }

        const updateModel = knex('activities')
            .where('activity_id', activity.activityId)
            .transacting(t)
            .update({
                program_id: activity.programId, 
                name: activity.name,
                start: activity.start,    
                end: activity.end,      
                priority: activity.priority,
                activity_type_id: activity.activityTypeId,
                location: activity.location,
                description: activity.description,
                repeat: activity.repeat,
                total_points: activity.totalPoints,
                is_public : activity.isPublic,
                status: activity.activityTypeId == 11 ? 1 : status,
                modified_by: user.employeeId || user.sub,
                modified_at: knex.fn.now()
            });
        
        console.log("Update activity: ", updateModel.toSQL().toNative())
        await updateModel;

        if (activity.competencyIds) {
            const insertCompetencyIds = activity.competencyIds.map(competency => {
                return {
                    activity_id: activity.activityId,
                    organization_id : activity.organizationId || user.organization,
                    competency_id: competency.competencyId
                }
            });
    
            await knex('competencies_tags').where('activity_id', activity.activityId).del().catch(error => console.log(error));
            await knex('competencies_tags')
            .insert(insertCompetencyIds)
            .catch(error => { 
                if (error && error.code == '23505')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each activity' })) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
        }   

        const notificationMessage = `There have been some changes to the ${activity.repeat && 'repeating'} activity <strong>${activity.name}</strong> 
        that's starting at ${moment(activity.start).format('L')} and ending at ${moment(activity.end).format('L')}, please take a look.`

        if(activity.priority == 1) {
            const users = await knex('employee_programs')
                .join('employees', 'employees.employee_id', 'employee_programs.employee_id')
                .join('users', 'users.user_id', 'employees.user_id')
                .where('program_id', activity.programId)
                .andWhere('employees.is_learner', true)
                .andWhere('users.is_active', true)
                .select(['users.user_id']);
            
            users.map(user => {
                notifications.push(notificationService.create({
                    notification: {
                        text: notificationMessage,
                        notification_type_id: 2
                    }, 
                    userId: user.user_id,
                    transaction: t
                })); 
            });
        }

        if(activity.priority == 2 && activity.levels && activity.levels.length > 0) {
            await knex('activity_levels')
            .where('activity_id', activity.activityId)
            .transacting(t)
            .del();

            const insertActivityLevels = activity.levels.map(p => {
                return {
                    activity_id: activity.activityId,
                    exp_level_id: p.expLevelId
                }
            });
        
            await knex('activity_levels')
                .transacting(t)
                .insert(insertActivityLevels);

            const users = await knex('employees')
                .join('users', 'users.user_id', 'employees.user_id')
                .whereIn('employees.exp_level_id', activity.levels.map(l => l.expLevelId))
                .andWhere('employees.is_learner', true)
                .andWhere('users.is_active', true)
                .select(['users.user_id']);
            
            users.map(user => {
                notifications.push(notificationService.create({
                    notification: {
                        text: notificationMessage,
                        notification_type_id: 2
                    }, 
                    userId: user.user_id,
                    transaction: t
                })); 
            });
        }

        if(activity.priority == 3 && activity.participants && activity.participants.length > 0) {
            await knex('activity_participants')
                .where('activity_id', activity.activityId)
                .transacting(t)
                .del();

            
            const insertParticipants = activity.participants.map(p => {
                return {
                    activity_id: activity.activityId,
                    employee_id: p.employeeId
                }
            });
    
            console.log("Insert participants:",insertParticipants )
            await knex('activity_participants')
                .transacting(t)
                .insert(insertParticipants);

            const users = await knex('employees')
                .join('users', 'users.user_id', 'employees.user_id')
                .whereIn('employees.employee_id', activity.participants.map(r => r.employeeId))
                .andWhere('users.is_active', true)
                .select(['users.user_id']);
            
            users.map(user => {
                notifications.push(notificationService.create({
                    notification: {
                        text: notificationMessage,
                        notification_type_id: 2
                    }, 
                    userId: user.user_id,
                    transaction: t
                })); 
            });
            
        }

        await Promise.all(notifications);
        return {...activity, warning};
    })
    .catch(err => console.log('Update activity error', err));
}

async function updateStatus(activityId, statusId, user)
{
    console.log("Delete activity: ", activityId, statusId, user)
    let model = knex('activities')
        .where('activity_id', activityId);

    if(user.role != Role.SuperAdmin) {
        model.where(function() {
            this.where('activities.assigned_by', user.employeeId || user.sub)
            .orWhereIn('activities.activity_id', function() {
                this.select('activity_id').from('activity_participants').where('employee_id', user.employeeId);
            })
        })
    }

    return await model.update({
            status: statusId.statusId,
            modified_at: knex.fn.now(),
            modified_by: user.employeeId || user.sub
        });
}

async function logActivity(activity, user)
{
    let organizationId = (user.role == Role.SuperAdmin && activity.organizationId) ? activity.organizationId : user.organization;

    return knex.transaction(async function(t) {
        let notifications = [];

        const activityId = await 
        knex('log_activities')
        .transacting(t)
        .insert({
            program_id: activity.programId, 
            name: activity.name,
            start: activity.start,      
            end: activity.end,      
            activity_type_id: activity.activityTypeId,
            location: activity.location,
            details: activity.details,
            logged_by: user.employeeId,
            status: activity.activityTypeId == 11 ? 1 : 2,
            is_public : activity.isPublic,
            created_by: user.employeeId,
            modified_by: user.employeeId
        }).returning('log_activity_id');


        const loggedBy = await userService.getByEmployeeId(user, user.employeeId);

        if (activity.competencyIds) {
            const insertCompetencyIds = activity.competencyIds.map(competency => {
                return {
                    log_activity_id: activityId[0],
                    organization_id : organizationId,
                    competency_id: competency.competencyId
                }
            });
    
            await knex('competencies_tags').transacting(t).where('log_activity_id', activityId[0]).del().catch(error => console.log(error));
            await knex('competencies_tags')
            .transacting(t)
            .insert(insertCompetencyIds)
            .catch(error => { 
                if (error && error.code == '23505')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each activity' })) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
            });
        }

        const insertActivitySupervisors = activity.supervisors.map(p => {
            notifications.push(notificationService.create({
                notification: {
                    text: `You have been named a supervisor on the ${activity.name} activity logged by ${loggedBy.name} ${loggedBy.surname}`,
                    notification_type_id: 2,
                    reference: activityId[0]
                }, 
                employeeId: p.employeeId,
                transaction: t
            })); 

            return {
                log_activity_id: activityId[0],
                employee_id: p.employeeId
            }
        });        
    
        await knex('log_activity_supervisors')
            .transacting(t)
            .insert(insertActivitySupervisors);

        await Promise.all(notifications);
        return {...activity, activityId};   

    })
    .catch( error => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message}))});
}

async function updateLogActivity(activity, user)
{
    let organizationId = (user.role == Role.SuperAdmin && activity.organizationId) ? activity.organizationId : user.organization;

    return knex.transaction(async function(t) {

        const res = await knex('log_activities')
            .transacting(t)
            .where('log_activity_id', activity.activityId)
            .update({
                name: activity.name,
                start: activity.start,      
                end: activity.end,      
                details: activity.details,
                activity_type_id: activity.activityTypeId,
                location: activity.location,
                status: activity.activityTypeId == 11 ? 1 : 2,
                is_public : activity.isPublic,
                modified_by: user.employeeId,
                modified_at: knex.fn.now(),
            });

            if (activity.competencyIds) {
                const insertCompetencyIds = activity.competencyIds.map(competency => {
                    return {
                        log_activity_id: activity.activityId,
                        organization_id : organizationId,
                        competency_id: competency.competencyId
                    }
                });
        
                await knex('competencies_tags').where('log_activity_id', activity.activityId).del().catch(error => console.log(error));
                await knex('competencies_tags')
                .insert(insertCompetencyIds)
                .catch(error => { 
                    if (error && error.code == '23505')
                        throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Competency Id should be unique for each activity' })) 
                    else
                        throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message })) 
                });
            }

            const insertActivitySupervisors = activity.supervisors.map(p => {
                return {
                    log_activity_id: activity.activityId,
                    employee_id: p.employeeId
                }
            });
        
            await knex('log_activity_supervisors')
                .where('log_activity_id', activity.activityId)
                .transacting(t)
                .del();

            await knex('log_activity_supervisors')
                .transacting(t)
                .insert(insertActivitySupervisors);
    
            try {
                await t.commit();
            }
            catch(error) {
                console.log("Error while updating logged activity: ", error)
                await t.rollback();
            }
    })
    .catch(err => console.log('Log activity error:', err));
}

async function getParticipationLevels(user) {
    return knex.select([
            'activity_participation_levels.participation_level as participationLevel', 
            'activity_participation_levels.type as type', 
        ])
        .from('activity_participation_levels')
        .orderBy('participation_level', 'asc')
        .then(function(events){
            return events;
        });
}

async function getLogActivityById(activityId, user) {
    const activityDetails = await knex.select([
        'log_activities.log_activity_id as activityId', 
        'log_activities.program_id as programId', 
        'log_activities.name',
        'log_activities.start',             
        'log_activities.end', 
        'log_activities.activity_type_id as activityTypeId',
        'log_activities.location',
        'log_activities.details',
        'log_activities.status',
        'log_activities.is_public as isPublic', 
        'log_activities.logged_by as loggedBy',
        'users.name as loggedByFirstName',
        'users.surname as loggedByLastName',
    ])
    .from('log_activities')
    .join('employees', 'employees.employee_id', 'log_activities.logged_by')
    .join('users', 'users.user_id', 'employees.user_id')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'log_activities.status')
    .where('log_activities.log_activity_id', activityId)
    .andWhere('log_activities.status', '<>', 3)
    .limit(1)
    .first();

    if(activityDetails) {
        const supervisors = await knex.select([
            'log_activity_supervisors.log_activity_id as activityId', 
            'users.name as firstName', 
            'users.surname as lastName',
            'employees.employee_id as employeeId',             
        ])
        .from('log_activity_supervisors')
        .join('employees', 'employees.employee_id', 'log_activity_supervisors.employee_id')
        .join('users', 'users.user_id', 'employees.user_id')
        .where('log_activity_supervisors.log_activity_id', activityId);
        
        if(supervisors && supervisors.length > 0) {
            activityDetails.supervisors = supervisors.map(p => {
                return {
                    employeeId: p.employeeId,
                    name: `${p.firstName} ${p.lastName}`
                }
            });
        }
        else {
            activityDetails.supervisors = [];
        }

        activityDetails.files = await knex("log_activities_files")
            .where("log_activity_id", activityId)
            .select([
            "log_activities_files.name",
            "log_activities_files.size",
            "log_activities_files.file",
            "log_activities_files.log_activity_file_id as logActivityFileId"
            ]);

        let assetsDomain = await getOrganizationAssetsDomain(user.organization);      
        activityDetails.files.map(file => {
            file.url = `${assetsDomain}/${file.file}${file.name}`;            
            return file;
        }); 

        activityDetails.links = await knex("log_activities_links")
            .where("log_activity_id", activityId)
            .select([
                "log_activities_links.url",
                "log_activities_links.log_activity_link_id as logActivityLinkId"
            ]);
        
        const competencies = await knex.table('competencies_tags')
            .leftJoin('log_activities', 'competencies_tags.log_activity_id' , 'log_activities.log_activity_id')
            .leftJoin('competencies', 'competencies_tags.competency_id' , 'competencies.competency_id')
            .andWhere('log_activities.log_activity_id', activityId)
            .select([
                'competencies.competency_id as competencyId',
                'competencies.code as competencyCode', 
                'competencies.title as competencyTitle', 
             ]);

        activityDetails.competencyIds = competencies.map(d => ({
            competencyId: d.competencyId,
            competencyCode: d.competencyCode,
            competencyTitle: d.competencyTitle
        }));  

        activityDetails.replies = await getLogActivityReplies(activityId, user);
    }
    
    return activityDetails;
}

async function updateLogActivityStatus(activityId, statusId, user)
{
    console.log("Update log activity status service:", activityId, statusId, user)
    return knex('log_activities')
        .where('log_activity_id', activityId)
        .update({
            status: statusId.statusId,
            modified_at: knex.fn.now(),
            modified_by: user.employeeId
        });
}

async function getReplies(activityId, user , organizationId) {
    console.log("Entered get replies:", activityId, user)
    let replyModel = knex.select([
        'activity_replies.activity_reply_id as activityReplyId',
        'users.name as firstName', 
        'users.surname as lastName',
        'employees.profile_photo as profilePhoto',  
        'employees.employee_id as employeeId',
        'employees.is_learner as isLearner',
        'activity_replies.text',
        'activity_replies.modified_at as modifiedAt'  ,
        'activity_points.points as points'  ,    
        'activity_points.starting_date as startingDate'   ,
        'activity_statuses.name as status',
        'activity_statuses.activity_status_id as statusId',
        'activities.is_public as isPublic',
        'activities.is_public as isPublic',
    ])
    .from('activity_replies')
    .join('employees', 'employees.employee_id', 'activity_replies.employee_id')
    .join('users', 'users.user_id', 'employees.user_id')
    .join('activities', 'activities.activity_id', 'activity_replies.activity_id')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .leftJoin('activity_points', 'activity_points.activity_reply_id', 'activity_replies.activity_reply_id')
    .where('activity_replies.activity_id', activityId)
    .where('activity_replies.active', true);
    
    const response = await replyModel.orderBy('activity_replies.modified_at', 'asc');

    let tempResponse = response.map( async(res) => {   
        res.files = await knex("activities_files")
            .where("activity_reply_id", res.activityReplyId)
            .select([
            "activities_files.name",
            "activities_files.size",
            "activities_files.file",
            "activities_files.activity_file_id as activityFileId"
            ]);

        let assetsDomain = await getOrganizationAssetsDomain(organizationId);      
        res.files.map(file => {
            file.url = `${assetsDomain}/${file.file}${file.name}`;            
            return file;
        });

        res.links = await knex("activities_links")
            .where("activity_reply_id", res.activityReplyId)
            .select([
                "activities_links.url",
                "activities_links.activity_link_id as activityLinkId"
            ]);

        return res;
    });    


    let finalResponse = await Promise.all(tempResponse);

    let replies = [];
    if(finalResponse && finalResponse.length > 0) {
        replies =  finalResponse.filter(x => (x.isPublic == true) || (user.role !== 'Learner') || (user.role == 'Learner' &&  x.isPublic == false && ((x.isLearner == true && x.employeeId == user.employeeId ) || (x.isLearner == false))))
        .map(r => {
            return {
                activityReplyId: r.activityReplyId,
                employeeId: r.employeeId,
                avatar: converter.ConvertImageBufferToBase64(r.profilePhoto),
                learner: `${r.firstName} ${r.lastName}`,
                text: r.text,
                modifiedAt: r.modifiedAt,
                points : r.points,
                startingDate: r.startingDate,
                status: r.status,
                statusId : r.statusId,
                activitiesReplyFiles : r.files,
                activitiesReplyLinks : r.links
            }
        });    
    }

    return replies;
}

async function addReply(reply, user) {
    console.log("Entered add reply:", reply.activityId, user)

    var actvity = await getActivityStatusDetails(reply.activityId);
    var status = actvity && actvity.length > 0 ? actvity[0].status : null;
    console.log("actvity => ", actvity , status);

    if(status && status !== 6)
    {
        return knex.transaction(async function(t) {
            const activityId = await 
            knex('activity_replies')
            .transacting(t)
            .insert({
                activity_id: reply.activityId, 
                employee_id: user.employeeId,
                text: reply.text,      
                created_by: user.employeeId  || user.sub,
                modified_by: user.employeeId || user.sub
            }).returning('activity_reply_id');

            try {
                await t.commit();
            }
            catch(error) {
                console.log("Error while replying to activities: ", error)
                await t.rollback();
            }
        })
        .catch(err => console.log('Reply to activity error:', err));
    }
}

async function updateReply(replyId, reply, user)
{
    return knex.transaction(async function(t) {
        await knex('activity_replies')
        .where('activity_reply_id', replyId)
        .andWhere('employee_id', user.employeeId)
        .transacting(t)
        .update({
            text: reply.text,
            modified_at: knex.fn.now(),
            modified_by: user.employeeId
        });

        try {
            await t.commit();
        }
        catch(error) {
            console.log("Error while updating your reply to activity: ", error)
            await t.rollback();
        }
    })
    .catch(err => console.log('Reply to activity error:', err));
}

async function deleteReply(replyId, user) {

    let replyModel =  knex('activity_replies')
    .where('activity_reply_id', replyId)
    .andWhere('employee_id', user.employeeId);
    
    try {
        var affected = await replyModel
            .update({
                active: false,
                modified_at: knex.fn.now(),
                modified_by: user.employeeId  || user.sub
            })
            .returning('*');

        if(!affected || affected && affected.length == 0) {
            throw new Error("You can't delete this reply!");
        }
    }
    catch(error) {
        console.log("Error while deleting your reply to activity: ", error)
        throw error;
    }

}

async function addActivityFile(loggedInUser, data) {

    let model = knex.select(['activities_files.file']).from('activities_files');

    let fileData = await model
    .where('activities_files.activity_id' , data.activityId)
    .limit(1)
    .first();

    let contentPath = `${uuidv4()}/`;
    if(fileData)
        contentPath = fileData.file;

    let activityFileId = 0;
    if(data && data.activityReplyId)
    {
        activityFileId = await knex('activities_files')
        .insert({
            activity_id: data.activityId,
            activity_reply_id: data.activityReplyId,
            file: contentPath,
            name: data.name,
            type: data.type,
            extension: data.extension,
            size: data.size
        })
        .returning('activity_file_id');
    }
    else {
        activityFileId =  await knex('activities_files')
        .insert({
            activity_id: data.activityId,
            file: contentPath,
            name: data.name,
            type: data.type,
            extension: data.extension,
            size: data.size
        })
        .returning('activity_file_id');
    }

    let cloudFileURL = await courseService.genetateCloudStorageUploadURL(contentPath ,data.file)

    return { activityFileId : activityFileId[0] , url : cloudFileURL}

  }
  
  async function deleteActivityFile(loggedInUser, id) {
    console.log('deleteActivityFile => ', id);
    
    let model = knex.select(['activities_files.file' , 'activities_files.name']).from('activities_files');

    let fileData = await model
    .where('activities_files.activity_file_id' , id)
    .limit(1)
    .first();

    deleteFileFromCloudStorage(fileData.file + fileData.name);

    return knex("activities_files")
      .where("activity_file_id", id)
      .del();
  }
  
  async function downloadActivityFile(loggedInUser, id , organizationId) {
    console.log('downloadFile => ', id);

    let data = await knex("activities_files")
      .where("activity_file_id", id)
      .select([
        "activities_files.name",
        "activities_files.file"      
      ])
      .first();

    let assetsDomain = await getOrganizationAssetsDomain(organizationId);  
    url = `${assetsDomain}/${data.file}${data.name}`;
    
    return {...data , url : url}
  }

  async function addLogActivityFile(loggedInUser, data) {
    
    let model = knex.select(['log_activities_files.file']).from('log_activities_files');

    let fileData = await model
    .where('log_activities_files.log_activity_id' , data.logActivityId)
    .limit(1)
    .first();

    let contentPath = `${uuidv4()}/`;
    if(fileData)
        contentPath = fileData.file;

    let activityFileId = await knex('log_activities_files')
      .insert({
        log_activity_id: data.logActivityId,
        file: contentPath,
        name: data.name,
        type: data.type,
        extension: data.extension,
        size: data.size
      })
      .returning('log_activity_file_id');

    let cloudFileURL = await courseService.genetateCloudStorageUploadURL(contentPath ,data.file)

    return { activityFileId: activityFileId[0] , url : cloudFileURL}
  
  }
  
  async function deleteLogActivityFile(loggedInUser, id) {
    console.log('deleteLogActivityFile => ', id);
       
    let model = knex.select(['log_activities_files.file' , 'log_activities_files.name']).from('log_activities_files');

    let fileData = await model
    .where('log_activities_files.log_activity_file_id' , id)
    .limit(1)
    .first();

    deleteFileFromCloudStorage(fileData.file + fileData.name);

    return knex("log_activities_files")
      .where("log_activity_file_id", id)
      .del();
  }
  
  async function downloadLogActivityFile(loggedInUser, id , organizationId) {
    console.log('downloadLogActivityFile => ', id);    
    let data = await knex("log_activities_files")
      .where("log_activity_file_id", id)
      .select([
        "log_activities_files.name",
        "log_activities_files.file"      
      ])
      .first();

    let assetsDomain = await getOrganizationAssetsDomain(organizationId);  
    url = `${assetsDomain}/${data.file}${data.name}`;
    
    return {...data , url : url}
  }

  async function addLogActivityLink(loggedInUser, data) {

    return await knex('log_activities_links')
      .insert({
        log_activity_id: data.logActivityId,
        url: data.url
      })
      .returning('log_activity_link_id');
  }
  
  async function deleteLogActivityLink(loggedInUser, id) {
    console.log('deleteLogActivityLink => ', id);
    
    return knex("log_activities_links")
      .where("log_activity_link_id", id)
      .del();
  }

  async function addActivityLink(loggedInUser, data) {

    if(data && data.activityReplyId) {
        return await knex('activities_links')
        .insert({
          activity_id: data.activityId,
          activity_reply_id: data.activityReplyId,
          url: data.url
        })
        .returning('activity_link_id');
    }
    else {
        return await knex('activities_links')
        .insert({
          activity_id: data.activityId,
          url: data.url
        })
        .returning('activity_link_id');
    }
  }
  
  async function deleteActivityLink(loggedInUser, id) {
    console.log('deleteActivityLink => ', id);
    
    return knex("activities_links")
      .where("activity_link_id", id)
      .del();
  }

  async function getLogActivityReplies(activityId, user) {
    console.log("Entered get log activity replies:", activityId, user)
    let replyModel = knex.select([
        'log_activity_replies.log_activity_reply_id as activityReplyId',
        'users.name as firstName', 
        'users.surname as lastName',
        'employees.profile_photo as profilePhoto',  
        'employees.employee_id as employeeId',
        'log_activity_replies.text',
        'log_activity_replies.modified_at as modifiedAt'          
    ])
    .from('log_activity_replies')
    .leftJoin('employees', 'employees.employee_id', 'log_activity_replies.employee_id')
    .leftJoin('users', 'users.user_id', 'employees.user_id')
    .where('log_activity_replies.activity_id', activityId)
    .where('log_activity_replies.active', true);
      
    const response = await replyModel.orderBy('modified_at', 'asc');
    let replies = [];

    if(response && response.length > 0) {
        replies = response.map(r => {
            return {
                activityReplyId: r.activityReplyId,
                employeeId: r.employeeId,
                avatar: converter.ConvertImageBufferToBase64(r.profilePhoto),
                resident: `${r.firstName} ${r.lastName}`,
                text: r.text,
                modifiedAt: r.modifiedAt
            }
        });
    }


    return replies;
}

async function addLogActivityReply(reply, user) {
    console.log("Entered add reply:", reply.activityId, user)

    return knex.transaction(async function(t) {
        const activityId = await 
        knex('log_activity_replies')
        .transacting(t)
        .insert({
            activity_id: reply.activityId, 
            employee_id: user.employeeId,
            text: reply.text,      
            created_by: user.employeeId  || user.sub,
            modified_by: user.employeeId || user.sub
        }).returning('log_activity_reply_id');

        try {
            await t.commit();
        }
        catch(error) {
            console.log("Error while replying to log activity: ", error)
            await t.rollback();
        }
    })
    .catch(err => console.log('Reply to activity error:', err));
}

async function updateLogActivityReply(replyId, reply, user)
{
    return knex.transaction(async function(t) {
        await knex('log_activity_replies')
        .where('log_activity_reply_id', replyId)
        .andWhere('employee_id', user.employeeId)
        .transacting(t)
        .update({
            text: reply.text,
            modified_at: knex.fn.now(),
            modified_by: user.employeeId
        });

        try {
            await t.commit();
        }
        catch(error) {
            console.log("Error while updating your reply to activity: ", error)
            await t.rollback();
        }
    })
    .catch(err => console.log('Reply to activity error:', err));
}

async function deleteLogActivityReply(replyId, user) {

    let replyModel =  knex('log_activity_replies')
    .where('log_activity_reply_id', replyId)
    .andWhere('employee_id', user.employeeId);
    
    try {
        var affected = await replyModel
            .update({
                active: false,
                modified_at: knex.fn.now(),
                modified_by: user.employeeId  || user.sub
            })
            .returning('*');

        if(!affected || affected && affected.length == 0) {
            throw new Error("You can't delete this reply!");
        }
    }
    catch(error) {
        console.log("Error while deleting your reply to activity: ", error)
        throw error;
    }

}

async function getActivityStatusIds() {
    let model = knex.select([
            'activity_statuses.activity_status_id as activityStatusId', 
            'activity_statuses.name as activityStatusName', 
        ])
        .from('activity_statuses')

    return await model.orderBy('activity_status_id', 'asc');
}

async function getActivityStatusDetails(activityId)
{
    let model = knex.select([
        'activities.activity_id as activityId', 
        'activities.status',
        'activities.is_public as isPublic',  
        'activities.total_points as totalPoints',
    ])
    .from('activities')
    .where('activities.activity_id' , activityId);

    return await model.orderBy('activity_id', 'asc');
}

async function evaluate(activityReply , user , activityId) {
    var errorStatus = 0;
    return knex.transaction(async function(t) {

        var actvity = await getActivityStatusDetails(activityId);
        var totalPoints  = actvity && actvity.length > 0 ? actvity[0].totalPoints : 0;

        var statusIds = await getActivityStatusIds();
        const closedStatus = statusIds.filter(c => c.activityStatusName == 'Closed').map(c =>  c.activityStatusId);

        const checkNotValidPoints = activityReply.filter(p => p.points && p.points > totalPoints).map(p => {
            return  p.activityReplyId
        });

        if(checkNotValidPoints && checkNotValidPoints.length > 0){   
            errorStatus = 1;
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Points should not exceed the total points.'}));
        }

        const activityReplyIds = activityReply.filter(p => p.points).map(p => {
            return  p.activityReplyId
        });

        const insertActivityReplyPoints = activityReply.filter(p => p.points).map(p => {
            return {
                activity_reply_id: p.activityReplyId,
                employee_id: p.employeeId,
                points: p.points,      
                starting_date: p.modifiedAt
            }
        });

        await knex('activity_points')
        .whereIn('activity_reply_id', activityReplyIds)
        .transacting(t)
        .del();

        await knex('activity_points')
        .transacting(t)
        .insert(insertActivityReplyPoints)
        .catch( error => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message}))});
        
        await knex('activities')
        .where('activity_id', activityId)
        .transacting(t)
        .update({
            status: closedStatus[0],
            modified_at: knex.fn.now(),
            modified_by: user.employeeId || user.sub
        })
        .catch( (error) => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message}))});    

        try {
            await t.commit();
        }
        catch(error) {
            console.log("Error while evaluate activity replies: ", error)
            await t.rollback();
        }
    })
    .catch( (error) => { 
        if(errorStatus == 1)
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Points should not exceed the total points.'}));
        else
            throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  error.message}));    
    });
}

async function getAllByLearner(user, userId, employeeId, selectedOrganizationId) {
    const userPrograms = await programService.getByCurrentUser(user, user.role == Role.SuperAdmin ? selectedOrganizationId : user.organization);
    const programIds = userPrograms && userPrograms.map(p => p.programId) || null;

    const userCourses = await courseService.getAllUserCourses(user, userId , selectedOrganizationId);
    const courseIds = userCourses && userCourses.map(p => p.courseId) || null;

    console.log("getAllByLearner => ", user,  programIds  , courseIds)

    let model = knex
    .select([
        'activities.activity_id as activityId', 
        'activities.program_id as programId', 
        'activities.name',
        'activities.start',             
        'activities.end', 
        'activities.priority',
        'activity_types.activity_type_id',
        'activities.location',
        'activities.repeat',
        'activities.description',
        'activity_statuses.name as status',
        'activity_statuses.activity_status_id as statusId',
        'activities.assigned_by as assignedBy',
        'activities.total_points as totalPoints',
        'activities.is_public as isPublic',  
        knex.raw('? as source', ['assigned']),
        knex.raw('NULL as rrule'),
        'activity_types.name as activityTypeName'
    ])
    .from('activities')
    .join('activity_types', 'activity_types.activity_type_id', 'activities.activity_type_id')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .leftJoin('activity_courses', 'activity_courses.activity_id', 'activities.activity_id')
    .leftJoin('activity_participants', 'activity_participants.activity_id', 'activities.activity_id')
    .where('activities.repeat', false)
    .andWhere('activity_types.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    model
    .andWhere(function() {
        this.whereIn('activities.program_id', programIds)
            .orWhereNull('activities.program_id')
    })
    .andWhere(function() {
        this.whereIn('activity_courses.course_id', courseIds ).orWhereNull('activity_courses.course_id')
    })
    .andWhere(function() {
        this.where('activity_participants.employee_id', user.employeeId ).orWhereNull('activity_participants.employee_id')
    }); 

    let logModel = knex
    .select([
        'log_activities.log_activity_id as activityId', 
        'log_activities.program_id as programId', 
        'log_activities.name',
        'log_activities.start',             
        'log_activities.end', 
        knex.raw('? as priority', ['1']),
        'activity_types.activity_type_id',
        'log_activities.location',
        knex.raw('? as repeat', [false]),
        'log_activities.details as description',
        'activity_statuses.name as status',
        'activity_statuses.activity_status_id as statusId',
        'log_activities.logged_by as assignedBy',
        knex.raw('? as totalPoints', ['0']),
        'log_activities.is_public as isPublic',  
        knex.raw('? as source', ['logged']),
        knex.raw('NULL as rrule'),
        'activity_types.name as activityTypeName'
    ])
    .from('log_activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'log_activities.status')
    .join('activity_types', 'activity_types.activity_type_id', 'log_activities.activity_type_id')
    .where('activity_types.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    logModel
    .andWhere(function() {
        this.whereIn('log_activities.program_id', programIds)
        .orWhereNull('log_activities.program_id')
        .orWhereIn('log_activities.log_activity_id', function() {
            this.select('log_activity_id').from('log_activity_supervisors').where('employee_id', employeeId);
        })
    })
    .andWhere(function() {
        this.where('logged_by', employeeId)
            .orWhereIn('log_activities.log_activity_id', function() {
                this.select('log_activity_id').from('log_activity_supervisors').where('employee_id', employeeId);
            })
            .orWhereIn('log_activities.program_id', function() {
                this.select('program_id').from('program_directors').where('employee_id', employeeId);
            })
    });
   
    model.andWhere('activities.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    logModel.whereIn('log_activities.program_id', function() {
        this.select('program_id').from('programs').where('organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);
    });

    let repeatingActivities = [];
    repeatingActivities = await getRepeatActivities(user, programIds, courseIds, selectedOrganizationId);
    repeatingActivities = _.uniqBy(repeatingActivities, 'activityId')
    const activities = await knex.unionAll(model, true).unionAll(logModel, true);

    return activities.concat(repeatingActivities);
    
}

function deleteFileFromCloudStorage(filePath) {
    cloudStorage
        .bucket(bucket)
        .file(filePath)
        .delete((err) => {
            if (!err) {
                console.log("deleting files in path gs://", bucket + "/" + filePath);
            } else {
                console.log("error : " + err);
                throw err;
            }
        });
}

async function getAllFiles(user , organizationId) {
    console.log('getAllActivityFiles => ' ,  user);

    const contentPath = 'GlobalFolder' + organizationId + '/' ;

    const [files] = await 
    cloudStorage
    .bucket(bucket)
    .getFiles({directory: contentPath})
    .catch((err)=>{
        console.log(err);
        throw err
    });

    let allGlobalFiles = files.map(file => {
        return {
            file: contentPath ,
            name : file.name.substring(file.name.indexOf('/') + 1)}
    });

    let assetsDomain = await getOrganizationAssetsDomain(organizationId);

    let tempCloudFiles = allGlobalFiles.map(async (data) => {  
        
        data.url = `${assetsDomain}/${data.file}${data.name}`;
        return data;
    });

    let allFiles = await knex("activities_files")
      .join('activities', 'activities_files.activity_id', 'activities.activity_id')
      .where("activity_reply_id", null)
      .andWhereNot("activities_files.file", null)
      .andWhere("activities.organization_id" , organizationId)
      .select(["activities_files.file" , "activities_files.name"]);

    let tempFiles = allFiles.map(async (data) => {        
        data.url = `${assetsDomain}/${data.file}${data.name}`;
        return data;
    });

    const combined = [...tempFiles, ...tempCloudFiles] 
    let allFilesData = await Promise.all(combined);

    return allFilesData;
  }

async function getOrganizationAssetsDomain(organizationId) {
    settings = await organizationService.getOrganizationSettingsByOrgId(organizationId);

    let assetsDomain = settings && settings.assetsDomain ?  settings.assetsDomain :  process.env.UPLOADS_URL;
    return assetsDomain;

}