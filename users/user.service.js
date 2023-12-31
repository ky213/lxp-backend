﻿const config = require('config.json');
const jwt = require('jsonwebtoken');
const Permissions = require('permissions/permissions');
const PermissionsService = require('permissions/permissions.service');
const bcrypt = require('bcrypt');
const knex = require('../db'); 
const organizationService = require('../organizations/organization.service');
const {Storage} = require('@google-cloud/storage');
const speech = require('@google-cloud/speech').v1p1beta1;


// Creates a client
const client = new speech.SpeechClient();

module.exports = {
    authenticate,
    getAll,
    getAllUsers,
    getByEmployeeId,
    getByUserId,
    updateProfilePhoto,
    checkIfEmailExists,
    changePassword,
    deleteEmployees,
    updateProfileData,
    updateBulk,
    forgotPassword,
    resetPassword,
    findResetPasswordToken,
    authToken,
    getByUserEmail,
    downloadCertificateAsPDF,
    convertSpeechToText
};

async function authenticate({ email, password }) {
    const user = await knex('users')
        .where('users.email', email.toLowerCase())
        .andWhere('users.is_active', true)
        .select(['users.user_id',
            'user_id as userId',
            'email',
            'name', 
            'name as firstName',
            'surname as lastName', 
            'is_super_admin',
            'password',
            'is_active as isActive',
            'profile_photo as profilePhoto'            
            ]
        )
        .first();
    console.log("Got user:", user.userId)
    if (user)
    {
        if(!user.isActive){
            console.log('user ',email,'is not active')
            return
        }

        const passIsValid = await bcrypt.compare(password, user.password);
        if (passIsValid)
        {
            if (user.profilePhoto) {
                user.profilePhoto = Buffer.from(user.profilePhoto).toString();
            }

            if(user.firstName && user.lastName) {
                user.fullName = `${user.firstName} ${user.lastName}`;
            }

            if(user.is_super_admin) {

                let perms = {}
                perms[Permissions.api.superadmins.isSuperAdmin] = 1

                // necu mijenjati sub s user_id pa sam dodao userId
                token = jwt.sign({ sub: user.user_id, userId: user.user_id, permissions: perms}, config.secret);

                user.role = 'SuperAdmin';
                user.roleDescription = 'Super Admin';
    
                const { password, is_super_admin, ...userWithoutPassword } = user;
                //const { password, ...userWithoutPassword } = user; // we shouldnt need super admin flag
                return {user: userWithoutPassword, token};
            }
            else
            {

                const [employee] = await knex('employees')
                    .leftJoin('organizations', 'organizations.organization_id', 'employees.organization_id')
                    .leftJoin('employee_programs', 'employee_programs.employee_id', 'employees.employee_id')
                    .leftJoin('program_directors', 'program_directors.employee_id', 'employees.employee_id')
                    .where('employees.user_id', user.userId)
                    .andWhere('organizations.is_active', true)
                    .select([
                        'employees.employee_id as employeeId',
                        'employees.organization_id as organizationId',
                        'employee_programs.program_id as programId',
                        'program_directors.program_id as directorProgramId',
                        'employees.exp_level_id as experienceLevelId']
                    );

                if(!employee.programId) {
                    employee.programId = user.directorProgramId;
                }

                if(employee.firstName && employee.lastName) {
                    employee.fullName = `${user.firstName} ${user.lastName}`;
                }


                const rolesDb = await knex('employees')
                    .leftJoin('organizations', 'organizations.organization_id', 'employees.organization_id')
                    .leftJoin('employee_roles', 'employee_roles.employee_id', 'employees.employee_id')
                    .leftJoin('roles', 'roles.role_id', 'employee_roles.role_id')
                    .where('employees.user_id', user.userId)
                    .andWhere('organizations.is_active', true)
                    .select([ 'employees.employee_id as employeeId',
                        'roles.role_id as role',
                        'roles.permissions as permissions',
                        ]
                    );


                var roles = []
                var permissions = {}

                for (let i=0; i < rolesDb.length; i++) {
                    r = rolesDb[i];
                    roles.push(r.role)
                    for(let i=0; i<r.permissions.length;i++){
                        permissions[r.permissions[i]] = 1;
                    }
                }

                // necu mijenjati sub s user_id pa sam dodao userId
                token = jwt.sign({ sub: user.user_id, userId: user.user_id, employeeId: employee.employeeId, roles: roles,permissions: permissions,
                    organization: employee.organizationId, programId: employee.programId, experienceLevelId: employee.experienceLevelId}, config.secret);

                const { password, is_super_admin, directorProgramId, ...userWithoutPassword } = employee;
                //const { password, ...userWithoutPassword } = user; // we shouldnt need super admin flag
                return {user: userWithoutPassword, token};
            }            
        }
    }
}

// user administration screens
async function getAll(user, pageId, recordsPerPage, filterName, filterEmail, isLearner, includeInactive, organizationId, filterProgramId) {

    let offset = ((pageId || 1) - 1) * recordsPerPage;

    organizationId = (PermissionsService.isSuperAdmin(user) && organizationId) ? organizationId : user.organization;

    var model = knex.table('employees')
        .innerJoin('users','users.user_id','employees.user_id')
        .innerJoin('organizations', 'organizations.organization_id', 'employees.organization_id')
        .leftJoin('employee_roles', 'employee_roles.employee_id', 'employees.employee_id')
        .leftJoin('roles', 'roles.role_id', 'employee_roles.role_id')
        .leftJoin('experience_levels', 'experience_levels.exp_level_id', 'employees.exp_level_id')
        .leftJoin('employee_programs', 'employee_programs.employee_id', 'employees.employee_id')
        .leftJoin('programs', 'programs.program_id', 'employee_programs.program_id')

    model.where('employees.organization_id', organizationId);
    model.andWhere('users.is_super_admin', 0);

    if (!PermissionsService.isSuperAdmin(user))
        model.where('employees.employee_id', "<>", user.employeeId);

    if (!includeInactive) {
        model.andWhere('employees.is_active', true);
    }        

    if (isLearner != null) {
        model.andWhere('employees.is_learner', isLearner);
        if(isLearner && filterProgramId) {
            model.whereIn('employees.employee_id', function() {
                this.select('employee_id').from('employee_programs').where('program_id', filterProgramId);
            });
        }
    }

    if (filterName)
    {        
        filterName = filterName.toLowerCase();
        model.andWhere(function() {
            this.whereRaw(`lower(users.name) || ' ' || lower(users.surname) like ?`, [`%${filterName.toLowerCase().trim()}%`])
            this.orWhereRaw(`lower(users.surname) || ' ' || lower(users.name) like ?`, [`%${filterName.toLowerCase().trim()}%`])
        });
    }    

    if (filterEmail)
    {        
        filterEmail = filterEmail.toLowerCase();
        model.andWhere(function() {
            this.whereRaw(`lower(users.email) like ?`, [`%${filterEmail.toLowerCase().trim()}%`])
        });
    }     

    var totalNumberOfRecords = await model.clone().count();

    if (totalNumberOfRecords[0].count <= offset)
        offset = 0;

    var users = await model.clone()
        .orderBy('employees.is_active', 'desc')
        .orderBy('surname', 'asc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'users.user_id as userId',
            'users.email', 
            'users.name',
            'users.surname',
            'users.gender',
            'users.start_date as startDate',
            'users.profile_photo as profilePhoto', 
            'users.is_active as isActiveUser',      
            'employees.employee_id as employeeId',
            'employees.is_active as isActive',
            'employees.exp_level_id as expLevelId',
            'employees.organization_id as organizationId',
            'organizations.name as organizationName',
            'roles.role_id as role',
            'roles.name as roleName',
            'experience_levels.name as expLevelName',
            'programs.name as programName',
            'programs.program_id as programId'
        ]);
    
        const allUserGroups =
        await knex.table('groups_employee')
            .join('employees', 'employees.employee_id', 'groups_employee.employee_id')
            .join('groups', 'groups.group_id', 'groups_employee.group_id')
            .whereIn('employees.user_id', users.map(u => u.userId))
            .select([
                'groups.group_id as groupId',
                'groups.name as name',
                'employees.user_id as userId'
            ]);                               

        const allUserCourses =
            await knex.table('user_courses')
                .join('courses', 'courses.course_id', 'user_courses.course_id')
                .whereIn('user_courses.user_id', users.map(u => u.userId))
                .select([
                    'user_courses.course_id as courseId',
                    'courses.name as name',
                    'user_courses.joining_date as joiningDate',
                    'user_courses.user_id as userId'
            ]); 

        return {
            users: users.map(user => {
            return {
                ...user,
                groupIds: allUserGroups.filter(u => u.userId == user.userId).map(d => {
                    return {
                        name: d.name,
                        groupId: d.groupId
                    }
                }),
                joinedCourses: allUserCourses.filter(u => u.userId == user.userId).map(d => {
                    return {
                        name: d.name,
                        courseId: d.courseId,
                        joiningDate: d.joiningDate
                    }
                })
            }
        }), 
        totalNumberOfRecords: totalNumberOfRecords[0].count
    };  
}

async function getAllUsers(loggedInUser, organizationId, includeInactive) {
    organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;

    let model = knex.table('employees')
        .innerJoin('users','users.user_id','employees.user_id')
        .where('employees.organization_id', organizationId)        
        .andWhere('users.is_super_admin', 0);
    
    if (!includeInactive)
        model.andWhere('employees.is_active', true)

    const users = await model.orderBy('surname')
    .select([
        'employees.employee_id',
        'users.name',
        'users.surname'
    ]);

    return users.map(u => {return {
        employeeId: u.employee_id,
        name: `${u.name} ${u.surname}`
    }});
}

async function getByEmployeeId(user, employeeId, programId) {

    let selectEmployee =  knex.select([
        'users.user_id as userId', 
        'users.email', 
        'users.name',
        'users.surname',
        'users.gender',
        'users.phone_number as phoneNumber',
        'users.pager_number as pagerNumber',
        'users.start_date as startDate',        
        'users.profile_photo as profilePhoto', 
        'users.is_active as isActiveUser',
        'employees.is_active as isActive',      
        'employees.employee_id as employeeId',
        'employees.exp_level_id as expLevelId',
        'employee_programs.program_id as programId',
        'experience_levels.name as expLevelName',
        'employees.organization_id as organizationId',
        'employee_roles.role_id as roleId',
        'roles.name as roleName'
    ])
    .from('employees')
    .join('users','users.user_id','employees.user_id')
    .leftJoin('experience_levels','employees.exp_level_id','experience_levels.exp_level_id')
    .leftJoin('employee_programs','employees.employee_id','employee_programs.employee_id')
    .leftJoin('employee_roles','employees.employee_id','employee_roles.employee_id')
    .leftJoin('roles','roles.role_id','employee_roles.role_id');

    if(!PermissionsService.isSuperAdmin(user)) {
        selectEmployee.andWhere('employees.organization_id', user.organization);
    }

    let userData = await selectEmployee
    .where('employees.employee_id', employeeId)
    .limit(1)
    .first();

    if(userData) {
        const groups = await knex.table('groups_employee')
        .join('employees', 'employees.employee_id', 'groups_employee.employee_id')
        .join('groups', 'groups.group_id', 'groups_employee.group_id')
        .andWhere('employees.employee_id', employeeId)
        .select([
            'groups.group_id as groupId',
            'groups.name as name'
         ]);

        userData.groupIds = groups.map(d => ({
            name: d.name,
            groupId: d.groupId
        }));

        let coursesData  = knex.select(['courses.course_id as courseId',
        'courses.name as name',
        'courses.content_path as contentPath',
        'courses.image',
        'courses.description as description',
        'courses.period_days as periodDays',
        'courses.starting_date as startingDate',
        'courses.program_id as programId',
        'courses.activity_number as courseActivityNumbers',
        'user_courses.activity_numbers_completed as activityCompleted',
        'user_courses.is_completed as isCompleted'
        ])
        .from('user_courses')
        .join('courses', 'user_courses.course_id', 'courses.course_id');

        if(programId)
        {
            coursesData.andWhere('courses.program_id', programId);
        }

        let courses = await coursesData
        .where('user_courses.user_id', userData.userId);

        userData.joinedCourses = courses.map(d => ({
            name: d.name,
            courseId: d.courseId,
            contentPath: d.contentPath,
            image : d.image,
            description : d.description,
            periodDays : d.periodDays,
            startingDate : d.startingDate,
            programId : d.programId,
            courseActivityNumbers : d.courseActivityNumbers,
            learnerActivityNumbers : d.activityCompleted,
            isCompleted : d.isCompleted,
            courseProgress : (d.courseActivityNumbers && d.activityCompleted ) ? d.activityCompleted / d.courseActivityNumbers : 0
        }));
    }

    return userData
}

async function getByUserId(user, userId) {

    let select =  knex.select([
            'user_id as userId', 
            'email', 
            'name',
            'surname',
            'gender',
            'phone_number as phoneNumber',
            'pager_number as pagerNumber',
            'start_date as startDate',
            'profile_photo as profilePhoto',
            'is_active as isActive'
        ])
        .from('users');

        let userData = await select
        .where('user_id', userId)
        .limit(1)
        .first();
        
        if(userData) {
            const groups = await knex.table('groups_employee')
            .join('employees', 'employees.employee_id', 'groups_employee.employee_id')
            .join('groups', 'groups.group_id', 'groups_employee.group_id')
            .andWhere('employees.user_id', userId)
            .select([
            'groups.group_id as groupId',
            'groups.name as name',
            'employees.employee_id as employeeId'
            ]);

            userData.groupIds = groups.map(d => ({
                name: d.name,
                groupId: d.groupId
            }));
        }

        return userData
}

async function checkIfEmailExists(email, userId) {
  let model = knex("users")
    .whereRaw('lower(email) = ?', email.toLowerCase());

  if (userId) model.whereNot("user_id", userId);
  console.log(model)
  let x = await model.count().first();

  if (x.count > 0) return true;
  else return false;
}

async function updateProfilePhoto(loggedInUser, userId, profilePhoto) {    
  return knex("users")
    .where("user_id", userId)
    .update({
      profile_photo: Buffer.from(profilePhoto)
    });
}

async function changePassword({oldPassword, newPassword}, user) {    
    console.log("Change password:", oldPassword, newPassword, user)
    const userExists = await knex("users")
      .where("user_id", user.sub)
      .select([
          'password'
      ]);

    if(userExists && userExists.length > 0 && userExists[0].password) {
       
        const passIsValid = await bcrypt.compare(oldPassword, userExists[0].password);
        //console.log('Hashed compare:', passIsValid)

        if(passIsValid) {
            await knex("users")
            .where("user_id", user.sub)
            .update({
                password: bcrypt.hashSync(newPassword, 10)
            });

            return {isValid: true}
        }
    }

    return { isValid: false, errorDetails: "User not found" };
  }

  async function deleteEmployees(loggedInUser, organizationId, employees) {
    console.log("Delete employees service: ", employees); 
    organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;

    let employeeIdList = await knex('employees')
        .whereIn('employee_id', employees)
        .andWhere('organization_id', organizationId)
        .select(['employee_id']);

    let employeeIds = employeeIdList.map(t => t.employee_id);

    let userIdsList = await knex('employees')
        .whereIn('employee_id', employees)
        .select(['user_id']);
    
    let userIds = userIdsList.map(t => t.user_id);   
    
    let notificationsList = await knex('notifications')
        .whereIn('user_id', userIds)
        .select(['notification_id']);
    
    let notificationsIds = notificationsList.map(t => t.notification_id);

    let activityReplyList = await knex('activity_replies')
        .whereIn('employee_id', employees)
        .select(['activity_id']);
    
    let activityReplyIds = activityReplyList.map(t => t.activity_id);

    let activityLinksList = await knex('activities_links')
        .whereIn('activity_id', activityReplyIds)
        .select(['activity_id']);
    
    let activityLinksIds = activityLinksList.map(t => t.activity_id);

    return knex
    .transaction(async function(t) {
        return knex.transaction(async function(t) {
            await knex("activity_participants")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();
            
            await knex("employee_programs")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("employee_roles")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("program_directors")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("employee_exp_levels")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("log_activity_supervisors")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();            
            
            await knex("activities_links")
            .transacting(t)
            .whereIn('activity_id', activityLinksIds)
            .del();
            
            await knex("activity_points")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("activity_replies")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del();

            await knex("employee_announcement_reads")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del()
            .catch(error => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message : error.message}))});

            await knex("employees")
            .transacting(t)
            .whereIn("employee_id", employeeIds)
            .del()
            .catch(error => { throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Can not delete user with related groups'}))});

            await knex("notification_channels")
            .transacting(t)
            .whereIn("notification_id", notificationsIds)
            .del();

            await knex("notifications")
            .transacting(t)
            .whereIn("user_id", userIds)
            .del(); 
            
            await knex("users")
            .transacting(t)
            .whereIn("user_id", userIds)
            .del()
            .catch(error => {
                if(error.code == '23503')
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message :  'Can not delete user with related courses'})) 
                else
                    throw new Error(JSON.stringify( {isValid: false, status: "error", code: error.code, message : error.message})) 
            });

        });        
    });
  }


  async function updateProfileData(loggedInUser, phoneNumber, pagerNumber) {
      console.log('updateProfileData loggedInUser', loggedInUser);
      return await knex('users')
        .where("user_id", loggedInUser.sub)
        .update({
            phone_number: phoneNumber,
            pager_number: pagerNumber
        })
  }

  async function updateBulk(loggedInUser, data, organizationId) {

    organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;
  
    let updates = [];
    let output = [];

    async function UpdateLearnerAsync(t, userData) {
      return new Promise(async function(resolve, reject) {     
        if(userData.joinedCourses && userData.joinedCourses.length > 0)
        { 
            userData.joinedCourses.forEach(course => {
                let insertUserCourse = {
                user_id: userData.userId,
                is_able_to_join: true,
                course_id: course,
                joining_date: knex.fn.now()
            };

            return t
            .into("user_courses")
            .insert(insertUserCourse)
            .then(() =>  {
                output.push({ ...userData, status: "ok" });
            })
            .catch(err => {
              output.push({ ...userData, isValid: false, status: "error", errorDetails: err });
              return resolve();
            }); 
          }); 
        }
  
        if(userData.groupIds && userData.groupIds.length > 0)
        {  
            userData.groupIds.forEach(group => {
                let employeeGroups = {
                employee_id: userData.employeeId,
                group_id: group 
              };        
              
              return t
              .into("groups_employee")
              .insert(employeeGroups)
              .then(() =>  {
                  output.push({ ...userData, status: "ok" });
               })
              .catch(err => {
                  output.push({ ...userData, isValid: false, status: "error", errorDetails: err });
                  return resolve();
                }); 
              }); 
            }          
            return resolve();
        }).
        catch(error => {
            return {
                isValid: false,
                errorDetails: error
              };
        });
      }
  
    const MapToArray = t => {
      data.forEach(user => {
        updates.push(UpdateLearnerAsync(t, user));
      });
    };
  
    return await knex
      .transaction(t => { 
        MapToArray(t);  
        Promise.all(updates)        
          .then(() => {
            return t.commit(output);
          })
          .catch(err => {
            return t.rollback(output);
          });
      })
      .catch(error => {
        console.log('inside rollback err ', output);
        t.rollback();
        return {
          isValid: false,
          errorDetails: error
        };
      });
  }

  async function forgotPassword(userData, host, resetPasswordToken , resetPasswordExpires ) {
    try{
        console.log('forgotPassword => ' , userData , host , resetPasswordToken, resetPasswordExpires);

        const user = await knex('users')
            .join('employees', 'employees.user_id', 'users.user_id')
            .where('users.email', userData.email.toLowerCase())
            .select([
                'users.user_id as userId',
                'users.email',
                'users.name',
                'users.surname', 
                'employees.organization_id as organizationId'
                ])
            .first();
            
        let updateUser = await knex('users')
        .where("user_id", user.userId)
        .update({
            reset_password_token: resetPasswordToken,
            reset_password_expires: resetPasswordExpires
        })
        .catch(error => console.log('forgotPassword => ' , error));

        var bodyString = 'Hello, {UserName} {UserLastName} </br> \n\n You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
        '<a href=' + process.env.FRONTEND_URL + '/pages/password-reset/' + resetPasswordToken + '>Click here</a>' + ' </br> \n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged. </br> \n\n' +
        'Best Wishes, </br> {OrgName} \n\n';

        let email = { UserEmail: user.email , UserName: user.name , organizationId: user.organizationId , isReset : 'TRUE',
            Subject: 'Password Reset',  Body: bodyString , UserLastName: user.surname.trim()};

        await organizationService.sendEmail(email, user);

        return {isValid: true}
    }
    catch(error)
    {
        console.log('forgotPassword => ' , error);
        return { isValid: false, status: "error", message: error };
    }

}

async function resetPassword(userData) {
    try{        
        console.log('resetPassword  => ' , userData );
        const user = await knex('users')
            .join('employees', 'employees.user_id', 'users.user_id')
            .where('users.email', userData.email.toLowerCase())
            .select([
                'users.user_id as userId',
                'users.email',
                'users.name', 
                'users.surname', 
                'employees.organization_id as organizationId'
                ])
            .first();

        let updateUser = await knex('users')
            .where("user_id", user.userId)
            .update({
                password: bcrypt.hashSync(userData.newPassword, 10),
                reset_password_token: null,
                reset_password_expires: null
            })
            .catch(error => console.log('resetPassword => ' , error));
 
        var email = {UserEmail: user.email , UserName: user.name , organizationId: user.organizationId,
            isReset : 'TRUE', Subject: 'Your password has been changed', UserLastName: user.surname ,
            Body: 'Hello, {UserName} {UserLastName} </br> \n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed. </br> \n' +
            'Best Wishes, </br> {OrgName} \n\n'
        };

        await organizationService.sendEmail(email, user);
        return {isValid: true}
    }
    catch(error)
    {
        console.log('resetPassword => ' , error);
        return { isValid: false, status: "error", message: error };
    }
}

async function findResetPasswordToken(userData){

    let user = await knex('users')
    .where('users.email', userData.email.toLowerCase())
    .select([
        'users.user_id as userId',
        'reset_password_token as ResetPasswordToken',
        'reset_password_expires as ResetPasswordExpires'
        ])
    .first();

    console.log('user' ,  user);
    if(user && user.ResetPasswordToken)
    {
        const currentTime = new Date();
        let validDate = user.ResetPasswordExpires.getTime() >= currentTime.getTime()  ? true  : false;
        
        console.log('validDate => ' , validDate , user.ResetPasswordExpires.getTime() , currentTime.getTime() );
        if(validDate == true)
            return user;
        else {
            await knex('users')
            .where('users.email', userData.email.toLowerCase())
            .update({
                reset_password_token: null,
                reset_password_expires: null
            })
            .catch(error => console.log('resetPassword => ' , error));

            return false;
        }
    }
    else{
        return false;
    }
}

async function authToken(token) {

    console.log('TOKEN: ',token);
    var decoded = jwt.verify(token, config.secret);

    if(!decoded)
        return;

    let userId = decoded.userId;

    console.log(userId , 'userId')
    const user = await knex('users')
            .where('users.user_id', userId)
            .andWhere('users.is_active', true)
            .select(['users.user_id',
                'user_id as userId',
                'email',
                'name', 
                'name as firstName',
                'surname as lastName', 
                'is_super_admin',
                'password',
                'is_active',
                'profile_photo as profilePhoto'            
                ]
            )
            .first();
        
        if (user)
        {  
            if (user.profilePhoto) {
                user.profilePhoto = Buffer.from(user.profilePhoto).toString();
            }

            if(user.firstName && user.lastName) {
                user.fullName = `${user.firstName} ${user.lastName}`;
            }

            if(user.is_super_admin) {

                user.role = 'SuperAdmin';
                user.roleDescription = 'Super Admin';
    
                const { password, is_super_admin, ...userWithoutPassword } = user;
                //const { password, ...userWithoutPassword } = user; // we shouldnt need super admin flag
                return {user: userWithoutPassword, token};
            }
            else
            {
                const [employee] = await knex('users')
                    .join('employees', 'employees.user_id', 'users.user_id')
                    .join('organizations', 'organizations.organization_id', 'employees.organization_id')
                    .leftJoin('employee_roles', 'employee_roles.employee_id', 'employees.employee_id')
                    .leftJoin('roles', 'roles.role_id', 'employee_roles.role_id')                    
                    .leftJoin('employee_programs', 'employee_programs.employee_id', 'employees.employee_id')
                    .leftJoin('program_directors', 'program_directors.employee_id', 'employees.employee_id')
                .where('employees.user_id', user.userId)
                    .andWhere('organizations.is_active', true)
                .limit(1)
                .select(['users.user_id',
                    'users.user_id as userId', 'employees.employee_id as employeeId', 'email', 'users.name', 
                    'users.name as firstName', 'surname as lastName', 
                    'is_super_admin', 'password', 
                    'users.profile_photo as profilePhoto',
                    'employees.organization_id as organizationId', 'organizations.name as organizationName', 'roles.role_id as role', 
                    'roles.name as roleDescription', 'organizations.color_code as organizationForegroundColor',
                    'organizations.background_color_code as organizationBackgroundColor', 'employee_programs.program_id as programId',
                    'program_directors.program_id as directorProgramId', 'employees.exp_level_id as experienceLevelId',
                    'organizations.logo as organizationLogo']
                );

                if(!employee.programId) {
                    employee.programId = user.directorProgramId;
                }

                if(employee.firstName && employee.lastName) {
                    employee.fullName = `${user.firstName} ${user.lastName}`;
                }                

                const { password, is_super_admin, directorProgramId, ...userWithoutPassword } = employee;
                return {user: userWithoutPassword, token};
            }        
        }
}

async function getByUserEmail(email) {

    let select =  knex.select([
            'users.user_id as userId', 
            'users.email', 
            'users.name',
            'users.surname',
            'users.start_date as startDate',
            'employees.employee_id as employeeId'
        ])
        .from('users')
        .join('employees', 'employees.user_id', 'users.user_id');

        let userData = await select
        .where('email', email.toLowerCase())
        .limit(1)
        .first();
        
        return userData
}

async function downloadCertificateAsPDF(organizationId,  userId , courseId) {

    let userCourseData  = knex.select(['courses.course_id as courseId',
        'courses.name as courseName',
        'courses.program_id as programId',
        'user_courses.is_completed as isCompleted',
        'users.email as userEmail',
        'users.name as userName',
        'users.surname as userLastName'
        ])
        .from('user_courses')
        .join('users', 'users.user_id', 'user_courses.user_id')
        .join('courses', 'user_courses.course_id', 'courses.course_id');

    let courses = await userCourseData
    .where('user_courses.user_id', userId)
    .andWhere('courses.organization_id', organizationId)
    .andWhere('user_courses.course_id', courseId);

    let tempCourses = courses.filter(c => c.isCompleted == true).map(async (course) => {
            console.log(' isCompleted => ' , course);

            let select =  knex.select([
                'organizations.name as Name', 
                'programs.certifcate_subject as Subject',
                'programs.certifcate_body as Body'
            ])
            .from('organizations')
            .leftJoin('programs', 'programs.organization_id', 'organizations.organization_id');
            
            let organization = await select
            .where('organizations.organization_id', organizationId)
            .andWhere('programs.program_id', course.programId)
            .limit(1)
            .first();
            
            const replacements = { OrgName: organization.Name , UserName: course.userName, UserLastName: course.userLastName,
                UserLogin: course.userEmail, UserCourse : course.courseName};
            
            let body = organization.Body ? organization.Body.replace(/{\w+}/g, placeholder =>
                replacements[placeholder.substring(1, placeholder.length - 1)] || placeholder, ) : null;

            course.htmlBody = body;
            return course;    
    });

    let coursesData = await Promise.all(tempCourses);

    return coursesData && coursesData.length > 0 ? coursesData[0] : coursesData;
}

async function convertSpeechToText(audioStream, textToCheck) {    

    // The audio file's encoding, sample rate in hertz, and BCP-47 language code
    const audio = {
        content: audioStream,
    };
      
    //[8000, 12000, 16000, 24000, 48000]
    // [LINEAR16, FLAC,MULAW,AMR,AMR_WB,OGG_OPUS,SPEEX_WITH_HEADER_BYTE]
  
    const config =  {
        //enableAutomaticPunctuation: true,
        //enableSpeakerDiarization: true,
        // audioChannelCount: 1,
        // enableSeparateRecognitionPerChannel: true,
        encoding: 'MP3' ,
        sampleRateHertz: 48000,
        languageCode: "ar-SA",
        model: "default"
      };
  
    const request = {
        audio: audio,
        config: config,
    };
    
    // Detects speech in the audio file
    const [response] = await client.recognize(request);

    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
  
    console.log(`Transcription: ${transcription} `);
  
    let found = false;
    let message = '';
    
    if (textToCheck == transcription){
        found = true;
        message = transcription;
    }
    else {
        found = false;
        message = 'Try again';
    }
  
    return { transcription , found , message  };
}
