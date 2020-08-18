const knex = require('../db'); 
const moment = require('moment');
require('moment-timezone');
const converter = require("helpers/converter");
const Role = require('helpers/role');
const notificationService = require('../notifications/notification.service');
const programService = require('../programs/program.service');
const userService = require('../users/user.service');
const { RRule, RRuleSet, rrulestr } = require('rrule');

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
};


function userHasAdminRole(user) {
    return user.role == Role.SuperAdmin || user.role == Role.LearningManager || user.role == Role.Admin;
}

async function getActivityTypes(user, selectedOrganizationId) {
    //console.log("Entered get activities")

    let model = knex.select([
            'activity_types.activity_type_id as activityTypeId', 
            'activity_types.name as activityTypeName', 
        ])
        .from('activity_types')

    model.andWhere('activity_types.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    return await model.orderBy('activity_type_id', 'asc');
}



async function getRepeatingActivities(user, programIds, from, to, selectedOrganizationId) {
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
        knex.raw('? as source', ['assigned']),
        'activities_repetitions.rrule'
    ])
    .from('activities_repetitions')
    .join('activities', 'activities_repetitions.activity_id', 'activities.activity_id')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .where('activity_statuses.activity_status_id', '<>', 3) // not deleted
    .andWhere('activities.repeat', true);

    if(!userHasAdminRole(user)) {
        repeatingActivitiesModel.andWhere(function() {
            this.whereIn('activities.program_id', programIds)
                .orWhereNull('activities.program_id')
        })
        .andWhere(function() {
            this.where('assigned_by', user.employeeId)
                .orWhereIn('activities.activity_id', function() {
                    this.select('activity_id').from('activity_participants').where('employee_id', user.employeeId);
                })
                .orWhereIn('activities.program_id', function() {
                    this.select('program_id').from('program_directors').where('employee_id', user.employeeId);
                })
                .orWhereIn('activities.program_id', function() {
                    this.select('program_id').from('employee_programs').where('employee_id', user.employeeId);
                })                
                .orWhere('activities.exp_level_id', user.experienceLevelId || null) 
        });
    }

    repeatingActivitiesModel.andWhere('activities.organization_id', user.role == Role.SuperAdmin && selectedOrganizationId || user.organization);

    //console.log("Get repeating activities query: ", repeatingActivitiesModel.toSQL().toNative())
    const repeatingActivities = await repeatingActivitiesModel;
    console.log("Repeating act:", repeatingActivities)
    //const parsed = rrulestr(repeatingActivities.map(r => r.rrule).join('\n'));

    let generatedActivities = [];
    
    for(let i = 0; i < repeatingActivities.length; i++) {
        const ra = repeatingActivities[i];
        if(ra) {
            const dtStart = moment(from, 'DDMMYYYY').startOf('day').utc().format("YYYYMMDDTHHmmss")

            const parsed = rrulestr("DTSTART:"+ dtStart +"\n" + ra.rrule);
            //console.log("Parsed rules:", parsed, moment(from, 'DDMMYYYY').startOf('day').utc().toDate(),moment(to, 'DDMMYYYY').utc().endOf('day').toDate(), parsed.all(), parsed.between(moment(from, 'DDMMYYYY').startOf('day').utc().toDate(), moment(to, 'DDMMYYYY').utc().endOf('day').toDate()))
            //const parsedDates = parsed.between(moment(from, 'DDMMYYYY').startOf('day').toDate(), moment(to, 'DDMMYYYY').endOf('day').toDate());
            const parsedDates = parsed.between(moment(from, 'DDMMYYYY').startOf('day').utc().toDate(), moment(to, 'DDMMYYYY').utc().endOf('day').toDate());
            //console.log("Parsed dates:", parsedDates)

            for(let j = 0; j < parsedDates.length; j++) {
                const date = parsedDates[j];
                //console.log("Got parsed date:", date)

                const start = moment(moment(date).format('DDMMYYYY') + ' ' + moment(ra.start).format('HH:mm'), 'DDMMYYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss');
                const end = moment(moment(date).format('DDMMYYYY') + ' ' + moment(ra.end).format('HH:mm'), 'DDMMYYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss');

                const act = {...ra, start, end};

                //const existing = getExistingActivities(act, user);
                //const status = calculateStatus(act, existing, user);
                //console.log("got calculated status:", act)
                generatedActivities.push(act);
            }
            //console.log("Parsed dates:", parsedDates)
            /*
            parsedDates.map(date => {
                //console.log("Generate activity for date:", date)
                const start = moment(moment(date).format('DDMMYYYY') + ' ' + moment(ra.start).format('HH:mm'), 'DDMMYYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss');
                const end = moment(moment(date).format('DDMMYYYY') + ' ' + moment(ra.end).format('HH:mm'), 'DDMMYYYY HH:mm').format('YYYY-MM-DDTHH:mm:ss');

                const act = {...ra, start, end};

                //const existing = getExistingActivities(act, user);
                //const status = calculateStatus(act, existing, user);
                //console.log("got calculated status:", act, existing, status)
                generatedActivities.push({...ra, start, end, status});
            })*/
        }
    }


    console.log("Generated repeating activities:", generatedActivities)
    
    return generatedActivities;
}


async function getAll(user, from, to, selectedOrganizationId) {
    //console.log("Entered get activities:", user, programId, from, to)

    const userPrograms = await programService.getByCurrentUser(user, user.role == Role.SuperAdmin ? selectedOrganizationId : user.organization);
    const programIds = userPrograms && userPrograms.map(p => p.programId) || null;
    console.log("Entered get activities:", userPrograms, programIds)

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
        knex.raw('? as source', ['assigned']),
        knex.raw('NULL as rrule'),
    ])
    .from('activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .where('activity_statuses.activity_status_id', '<>', 3) // not deleted
    .andWhere('activities.repeat', false)
    .andWhereBetween('activities.start', [moment(from, 'DDMMYYYY').startOf('day').toDate(), moment(to, 'DDMMYYYY').endOf('day').toDate()])

    if(!userHasAdminRole(user)) {
        model
        .andWhere(function() {
            this.whereIn('activities.program_id', programIds)
                .orWhereNull('activities.program_id')
        }).andWhere(function() {
            this.where('assigned_by', user.employeeId)
                .orWhereIn('activities.activity_id', function() {
                    this.select('activity_id').from('activity_participants').where('employee_id', user.employeeId);
                })
                .orWhereIn('activities.program_id', function() {
                    this.select('program_id').from('program_directors').where('employee_id', user.employeeId);
                })
                .orWhereIn('activities.program_id', function() {
                    this.select('program_id').from('employee_programs').where('employee_id', user.employeeId);
                })
                .orWhereIn('activities.activity_id', function() {
                    this.select('activity_id').from('activity_levels').where('exp_level_id', user.experienceLevelId);
                })
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
        knex.raw('? as source', ['logged']),
        knex.raw('NULL as rrule'),
    ])
    .from('log_activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'log_activities.status')
    .where('activity_statuses.activity_status_id', '<>', 3) // not deleted
    .andWhereBetween('log_activities.start', [moment(from, 'DDMMYYYY').startOf('day').toDate(), moment(to, 'DDMMYYYY').endOf('day').toDate()]);
    
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
        repeatingActivities = await getRepeatingActivities(user, programIds, from, to, selectedOrganizationId);
    }

    console.log("Got repeating activities:", repeatingActivities)

    //console.log("Get all activities query: ", knex.unionAll(model, true).unionAll(logModel, true).toSQL().toNative())
    const activities = await knex.unionAll(model, true).unionAll(logModel, true);
    return activities.concat(repeatingActivities);
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
        'activities.status',
        'activities.assigned_by as assignedBy',
        'activities.exp_level_id as level',
        'users.name as assignedByFirstName',
        'users.surname as assignedByLastName',
        'activities_repetitions.rrule',
        'activities.during'
    ])
    .from('activities')
    .join('activity_statuses', 'activity_statuses.activity_status_id', 'activities.status')
    .leftJoin('employees', 'activities.assigned_by', 'employees.employee_id')
    .leftJoin('users', 'users.user_id', 'employees.user_id')
    .leftJoin('activities_repetitions', 'activities_repetitions.activity_id', 'activities.activity_id')
    .where('activities.activity_id', activityId)
    /*.andWhere('activities.assigned_by', user.employeeId)
    .orWhereIn('activities.activity_id', function() {
        this.select('activity_id').from('activity_participants').where('employee_id', user.employeeId);
    })
    */
    .limit(1)
    .first();

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
        //.andWhere('users.active', true);
        
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
     
        activityDetails.replies = await getReplies(activityId, user);
        activityDetails.files = await knex("activities_files")
            .where("activity_id", activityId)
            .select([
            "activities_files.name",
            "activities_files.size",
            "activities_files.activity_file_id as activityFileId"
            ]);

        activityDetails.links = await knex("activities_links")
            .where("activity_id", activityId)
            .select([
                "activities_links.url",
                "activities_links.activity_link_id as activityLinkId"
            ]);
    }
    
    return activityDetails;
}

async function getExistingActivities(activity, user) {
    console.log("Activity start/end", activity )
    const userPrograms = await programService.getByCurrentUser(user, user.role == Role.SuperAdmin ? activity.organizationId : user.organization);
    const programIds = userPrograms && userPrograms.map(p => p.programId) || null;

    let existingActivitiesModel =  knex.select([
        'activities.activity_id as activityId', 
        'activities.program_id as programId', 
        'activities.name',
        'activities.start',             
        'activities.end', 
        'activities.priority',
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
        repeatingActivities = await getRepeatingActivities(user, programIds, 
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
    const userPrograms = await programService.getByCurrentUser(user, user.role == Role.SuperAdmin ? selectedOrganizationId : user.organization);
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
                during: activity.during,    
                priority: activity.priority,
                activity_type_id: activity.activityTypeId,
                location: activity.location,
                repeat: activity.repeat,
                description: activity.description,
                assigned_by: user.employeeId || user.sub,
                status: activity.activityTypeId == 11 ? 1 : status,
                repeat: activity.repeat || false,
                organization_id: activity.organizationId || user.organization,
                created_by: user.employeeId || user.sub,
                modified_by: user.employeeId || user.sub
            }).returning('activity_id');
        
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
                during: activity.during,    
                end: activity.end,      
                priority: activity.priority,
                activity_type_id: activity.activityTypeId,
                location: activity.location,
                repeat: activity.repeat,
                description: activity.description,
                status: activity.activityTypeId == 11 ? 1 : status,
                repeat: activity.repeat,
                modified_by: user.employeeId || user.sub,
                modified_at: knex.fn.now()
            });
        
        console.log("Update activity: ", updateModel.toSQL().toNative())
        await updateModel;

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
            participation_level: activity.participationLevel,
            location: activity.location,
            details: activity.details,
            logged_by: user.employeeId,
            status: activity.activityTypeId == 11 ? 1 : 2,
            created_by: user.employeeId,
            modified_by: user.employeeId
        }).returning('log_activity_id');


        const loggedBy = await userService.getByEmployeeId(user, user.employeeId);

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

        try {
            await Promise.all(notifications);
            await t.commit();
            
        }
        catch(error) {
            console.log("Error while logging activities: ", error)
            await t.rollback();
        }
    })
    .catch(err => console.log('Log activity error:', err));
}

async function updateLogActivity(activity, user)
{
    return knex.transaction(async function(t) {

        const res = await knex('log_activities')
            .transacting(t)
            .where('log_activity_id', activity.activityId)
            //.andWhere('logged_by', user.employeeId)
            .update({
                //program_id: activity.programId, 
                name: activity.name,
                participation_level: activity.participationLevel,
                start: activity.start,      
                end: activity.end,      
                details: activity.details,
                activity_type_id: activity.activityTypeId,
                location: activity.location,
                status: activity.activityTypeId == 11 ? 1 : 2,
                modified_by: user.employeeId,
                modified_at: knex.fn.now(),
            });

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
        'log_activities.participation_level as participationLevel',
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
            "log_activities_files.log_activity_file_id as logActivityFileId"
            ]);

        activityDetails.links = await knex("log_activities_links")
            .where("log_activity_id", activityId)
            .select([
                "log_activities_links.url",
                "log_activities_links.log_activity_link_id as logActivityLinkId"
            ]);
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

async function getReplies(activityId, user) {
    console.log("Entered get replies:", activityId, user)
    let replyModel = knex.select([
        'activity_replies.activity_reply_id as activityReplyId',
        'users.name as firstName', 
        'users.surname as lastName',
        'employees.profile_photo as profilePhoto',  
        'employees.employee_id as employeeId',
        'activity_replies.text',
        'activity_replies.modified_at as modifiedAt'          
    ])
    .from('activity_replies')
    .join('employees', 'employees.employee_id', 'activity_replies.employee_id')
    .join('users', 'users.user_id', 'employees.user_id')
    .where('activity_replies.activity_id', activityId)
    .where('activity_replies.active', true);
    
    /*
    if(user.role == Role.Learner) {
        replyModel
            .andWhere('activity_replies.employee_id', user.employeeId)
            .orWhereIn('activity_replies.employee_id', function() {
                this.select('employee_id').from('employees')
                    .where('organization_id', user.organization)
                    .andWhere('is_active', true)
                    .andWhere('is_learner', false)
            })
    }
    */

    const response = await replyModel.orderBy('modified_at', 'asc');
    let replies = [];
    if(response && response.length > 0) {
        replies = response.map(r => {
            return {
                activityReplyId: r.activityReplyId,
                employeeId: r.employeeId,
                avatar: converter.ConvertImageBufferToBase64(r.profilePhoto),
                learner: `${r.firstName} ${r.lastName}`,
                text: r.text,
                modifiedAt: r.modifiedAt
            }
        });
    }


    return replies;
}

async function addReply(reply, user) {
    console.log("Entered add reply:", reply.activityId, user)

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
    console.log('addActivityFile', data);
  
    return await knex('activities_files')
      .insert({
        activity_id: data.activityId,
        file: Buffer.from(data.file),
        name: data.name,
        type: data.type,
        extension: data.extension,
        size: data.size
      })
      .returning('activity_file_id');
  }
  
  async function deleteActivityFile(loggedInUser, id) {
    console.log('deleteActivityFile => ', id);
    
    return knex("activities_files")
      .where("activity_file_id", id)
      .del();
  }
  
  async function downloadActivityFile(loggedInUser, id) {
    console.log('downloadFile => ', id);
    return knex("activities_files")
      .where("activity_file_id", id)
      .select([
        "activities_files.name",
        "activities_files.file"      
      ])
      .first();
  }

  async function addLogActivityFile(loggedInUser, data) {
    //console.log('addLogActivityFile', data);
  
    return await knex('log_activities_files')
      .insert({
        log_activity_id: data.logActivityId,
        file: Buffer.from(data.file),
        name: data.name,
        type: data.type,
        extension: data.extension,
        size: data.size
      })
      .returning('log_activity_file_id');
  }
  
  async function deleteLogActivityFile(loggedInUser, id) {
    console.log('deleteLogActivityFile => ', id);
    
    return knex("log_activities_files")
      .where("log_activity_file_id", id)
      .del();
  }
  
  async function downloadLogActivityFile(loggedInUser, id) {
    console.log('downloadLogActivityFile => ', id);
    return knex("log_activities_files")
      .where("log_activity_file_id", id)
      .select([
        "log_activities_files.name",
        "log_activities_files.file"      
      ])
      .first();
  }

  async function addLogActivityLink(loggedInUser, data) {
    //console.log('addLogActivityFile', data);
  
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
    //console.log('addLogActivityFile', data);
  
    return await knex('activities_links')
      .insert({
        activity_id: data.activityId,
        url: data.url
      })
      .returning('activity_link_id');
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
    .join('employees', 'employees.employee_id', 'log_activity_replies.employee_id')
    .join('users', 'users.user_id', 'employees.user_id')
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



