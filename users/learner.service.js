const bcrypt = require("bcrypt");
const knex = require("../db");
const PermissionsService = require('permissions/permissions.service')
const validator = require("email-validator");
const {checkIfEmailExists} = require("./user.service");
const programService = require('../programs/program.service');
const organizationService = require('../organizations/organization.service');
const groupsvc = require("../groups/groups.service");
const coursessvc = require("../courses/course.service");
const userService = require("../users/user.service");
var generator = require('generate-password');
var _ = require('lodash');

module.exports = {
    add,
    addBulk,
    update,
    validateBulk,
    sendEmailForCourse,
    updateUserCourse
};

async function sendEmailForCourse(loggedInUser, courses, userId, organizationId , isActive) {
    if (courses && isActive) {
        await courses.forEach(course => {
            var email = {CourseId: course.courseId, organizationId: organizationId, UserId: userId};
            organizationService.sendEmail(email, loggedInUser);
        });
    }
}

async function updateUserCourse(courses, userId) {
    if (courses) {
        const insertcourseIds = courses.map(course => {
            return {
                user_id: userId,
                is_able_to_join: true,
                course_id: course.courseId,
                joining_date: knex.fn.now()
            }
        });

        await knex('user_courses').where('user_id', userId).del().catch(error => console.log(error));
        await knex('user_courses')
            .insert(insertcourseIds)
            .catch(error => console.log(error));

        return { userId: userId, courses: courses,  isValid: true  };     
    }
    else {
        console.log(userId , courses)
        await knex('user_courses').where('user_id', userId).del().catch(error => console.log(error));
        return { userId: userId, courses: null,  isValid: true  }
    }
}

async function add(loggedInUser, userData, organizationId) {
    userData = {
        ...userData,
        email: userData.email && userData.email.toLowerCase() || userData.email
    };

    organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;

    let validationOutput = await validateBulk(loggedInUser, [userData], organizationId);
    if (validationOutput.hasErrors) {
        return {
            isValid: false,
            errorDetails: validationOutput.data.filter(t => t.error).map(t => t.error).join(',')
        };
    }

    var password = generator.generate({length: 10, numbers: true});

    return knex
        .transaction(async function (t) {
            let userIds = await knex("users")
                .transacting(t)
                .insert({
                    name: userData.name.trim(),
                    surname: userData.surname.trim(),
                    email: userData.email.trim(),
                    gender: userData.gender,
                    start_date: userData.startDate,
                    password: bcrypt.hashSync(password, 10)
                })
                .returning("user_id");

            let _employees = userIds.map(userId => ({
                user_id: userId,
                organization_id: organizationId,
                is_learner: true
            }));

            let employeeIds = await knex("employees")
                .transacting(t)
                .insert(_employees)
                .returning("employee_id");

            let _employeeGroups = userData.groupIds.map(group => ({
                employee_id: employeeIds[0],
                group_id: group.groupId
            }));

            await knex("groups_employee")
                .transacting(t)
                .insert(_employeeGroups);

            if (userData.joinedCourses) {
                let insertcourseIds = userData.joinedCourses.map(course => ({
                    user_id: userIds[0],
                    is_able_to_join: true,
                    course_id: course.courseId,
                    joining_date: knex.fn.now()
                }));

                await knex('user_courses')
                    .transacting(t)
                    .insert(insertcourseIds)
                    .catch(err => {
                        return {isValid: false, status: "error", errorDetails: err};
                    });
            }


            await knex("employee_roles")
                .transacting(t)
                .insert({
                    employee_id: employeeIds[0],
                    role_id: 'Learner'          //TODO: this is workaround. We should allow to define custom learner role or roles for each organization
                });

            const userProgram = await programService.getDefaultProgram(loggedInUser, organizationId);
            if (userProgram) {
                await knex("employee_programs")
                    .transacting(t)
                    .insert({
                        employee_id: employeeIds[0],
                        program_id: userProgram.programId
                    });
            }

            var email = {
                UserEmail: userData.email.trim(), UserPass: password, UserLastName: userData.surname.trim(),
                UserId: userIds[0], UserName: userData.name.trim(), organizationId: organizationId
            };
            await organizationService.sendEmail(email, loggedInUser);

            return {
                userId: userIds[0],
                courses: userData.joinedCourses,
                isValid: true
            };
        })
        .catch(err => console.log("err", err));
}

async function addBulk(loggedInUser, data, exitData, organizationId) {

    data = data.map(d => ({
        ...d,
        email: d.email && d.email.toLowerCase() || d.email
    }));

    organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;
    let validationOutput = await validateBulk(loggedInUser, data, organizationId);

    let output = [];
    let update = [];
    
    if (validationOutput.hasErrors) {
        return {
            status: "error",
            errorDescription: validationOutput.data
                .filter(t => t.error)
                .map(t => t.error)
                .join(",")
        };
    }        

    const userProgram = await programService.getDefaultProgram(loggedInUser, organizationId);
    const defaultGroup = await organizationService.getDefaultGroup(organizationId);

    async function UpdateLearnerAsync(t, userData) {
        const user = await userService.getByUserEmail(userData.email.toLowerCase());

        let tempCourse = userData.joinedCourses ? userData.joinedCourses.map(async (course) => { 
            let courseExists = await coursessvc.checkIfCourseExists(course.courseId , user.userId);
            if(courseExists){
                return course;
            }
        }) : [];

        let newCourses = await Promise.all(tempCourse); 
        newCourses = _.compact(newCourses);

        let tempGroups = userData.groupIds ? userData.groupIds.map(async(group) => { 
            let groupExists = await groupsvc.checkIfGroupExists(group.groupId , user.employeeId);
            if(groupExists){
                return group;
            }
        }) : [] ;

        let newGroups = await Promise.all(tempGroups);
        newGroups = _.compact(newGroups);

        let insertsGroups = [];
        if (newGroups && (newGroups.length > 0 && newGroups[0])) {            
            newGroups.forEach(group => {
                    let employeeGroups = {
                        employee_id: user.employeeId,
                        group_id: group.groupId
                    };
                
                    var insert = (emplGroups) => {
                    t.into("groups_employee")
                        .insert(emplGroups)
                        .then(r => {
                            console.log("groups_employee created")
                        })
                        .catch(err => {
                            console.log(err);
                            output.push({...userData, isValid: false, status: "error", errorDetails: err});
                            throw  err;
                        });
                    }                    
                    insertsGroups.push(insert(employeeGroups))              
            });  
            
            if(insertsGroups && insertsGroups.length > 0){ 
                 Promise.all(insertsGroups)
                    .then(() => {
                        console.log('Employee groups will be persisted with commit.');
                    })
                    .catch(err => {
                        console.log('Rollback. Because:', err);
                        throw err;
                    });
            }
        } 

        let insertsCourses = [];
        if (newCourses && (newCourses.length > 0 && newCourses[0])) {  
            newCourses.forEach( course => {
                    let insertUserCourse = {
                        user_id: user.userId,
                        is_able_to_join: true,
                        course_id: course.courseId,
                        joining_date: knex.fn.now()
                    };

                    var insert = async (userCourse) => {
                        await t.into("user_courses")
                            .insert(userCourse)
                            .then(r => {
                                console.log("user_courses created");                                
                            })
                            .catch(err => {
                                console.log(err);
                                output.push({...userData, isValid: false, status: "error", errorDetails: err});
                                throw  err;
                            });
                    }
                    insertsCourses.push(insert(insertUserCourse));              
            }); 

            if(insertsCourses && insertsCourses.length > 0){
                Promise.all(insertsCourses)
                .then(() => {
                    console.log('user courses will be persisted with commit');                 
                })
                .catch(err => {
                    console.log('Rollback. Because:', err);
                    throw err;
                });                
            }
        }

        var email = {
            UserEmail: userData.email.trim(), UserLastName: userData.surname.trim(),
            UserName: userData.name.trim(), organizationId: organizationId , isUpdate :'TRUE'
        };

        console.log('Send email'); 
        await organizationService.sendEmail(email, loggedInUser);       

        update.push({...userData, status: "ok"});

    }

    async function InsertLearnerAsync(t, userData) {
        var password = generator.generate({length: 10, numbers: true});
        let usersIds = await t.into("users")
            .insert({
                name: userData.name.trim(),
                surname: userData.surname.trim(),
                email: userData.email.trim(),
                gender: userData.gender,
                start_date: userData.startDate,
                password: bcrypt.hashSync(password, 10)
            })
            .returning("user_id")
            .then(userIds => {
                console.log("user created: ", userIds)
                return userIds;
            })
            .catch(err => {
                console.log(err);
                output.push({...userData, isValid: false, status: "error", errorDetails: err});
                throw  err;
            });

        let _employees = usersIds.map(userId => {
            return {
                user_id: userId,
                organization_id: organizationId,
                exp_level_id: null,
                is_learner: true
            };
        });

        employeesIds = await t.into("employees")
            .insert(_employees)
            .returning("employee_id")
            .then(employeeIds => {
                console.log("employee created")
                return employeeIds;
            })
            .catch(err => {
                console.log(err);
                output.push({...userData, isValid: false, status: "error", errorDetails: err});
                throw  err;
            });

        let employeeRoles = employeesIds.map(employeeId => ({
            employee_id: employeeId,
            role_id: 'Learner'
        }));

        await t.into("employee_roles")
            .insert(employeeRoles)
            .then(() => {
                console.log("employee_roles created")
            })
            .catch(err => {
                console.log(err);
                output.push({...userData, isValid: false, status: "error", errorDetails: err});
                throw  err;
            });

        if (userProgram) {
            let employeePrograms = employeesIds.map(employeeId => ({
                employee_id: employeeId,
                program_id: userProgram.programId
            }));

            await t.into("employee_programs")
                .insert(employeePrograms)
                .then(r => {
                    console.log("employee_programs created")
                })
                .catch(err => {
                    console.log(err);
                    output.push({...userData, isValid: false, status: "error", errorDetails: err});
                    throw  err;
                });
        }

        if (userData.groupIds && userData.groupIds.length > 0) {

            let inserts = [];
            userData.groupIds.forEach(group => {
                let employeeGroups = employeesIds.map(employeeId => ({
                    employee_id: employeeId,
                    group_id: group.groupId
                }));

                var insert = (emplGroups) => {
                    t.into("groups_employee")
                        .insert(emplGroups)
                        .then(r => {
                            console.log("groups_employee created")
                        })
                        .catch(err => {
                            console.log(err);
                            output.push({...userData, isValid: false, status: "error", errorDetails: err});
                            throw  err;
                        });
                }

                inserts.push(insert(employeeGroups))
            });

            Promise.all(inserts)
                .then(() => {
                    console.log('Employee groups will be persisted with commit.');                    
                })
                .catch(err => {
                    console.log('Rollback. Because:', err);
                    throw err;
                });

        } else {

            if (defaultGroup && defaultGroup.defaultGroupId) {
                let employeeGroups = employeesIds.map(employeeId => ({
                    employee_id: employeeId,
                    group_id: defaultGroup.defaultGroupId
                }));

                await t.into("groups_employee")
                    .insert(employeeGroups)
                    .then(r => {
                        console.log("groups_employee created")
                    })
                    .catch(err => {
                        console.log(err);
                        output.push({...userData, isValid: false, status: "error", errorDetails: err});
                        throw  err;

                    });
            }
        }// end if groups

        if (userData.joinedCourses && userData.joinedCourses.length > 0) {

            let inserts = [];
            userData.joinedCourses.forEach(course => {
                let insertUserCourse = usersIds.map(userId => ({
                    user_id: userId,
                    is_able_to_join: true,
                    course_id: course.courseId,
                    joining_date: knex.fn.now()
                }));

                var insert = async (userCourse) => {
                    await t.into("user_courses")
                        .insert(userCourse)
                        .then(r => {
                            console.log("user_courses created")
                        })
                        .catch(err => {
                            console.log(err);
                            output.push({...userData, isValid: false, status: "error", errorDetails: err});
                            throw  err;
                        });
                }

                inserts.push(insert(insertUserCourse))
            });

            Promise.all(inserts)
                .then(() => {
                    console.log('user courses will be persisted with commit');           
                })
                .catch(err => {
                    console.log('Rollback. Because:', err);
                    throw err;
                });
        }
        
        var email = {
            UserEmail: userData.email.trim(), UserPass: password, UserLastName: userData.surname.trim(),
            UserName: userData.name.trim(), organizationId: organizationId
        };
        await organizationService.sendEmail(email, loggedInUser);

        output.push({...userData, status: "ok"});

    }

    async function sendUserCoursesEmail(existUsers , users) {
        if(users){
            for (let i = 0; i < users.length; i++) {
                let user = users[i];
                const userData = await userService.getByUserEmail(user.email.toLowerCase());
                user.joinedCourses.forEach(async(course) => { 
                    var email = { CourseId: course.courseId, organizationId: organizationId, UserId: userData.userId};
                    await organizationService.sendEmail(email, loggedInUser);
                });
            }
        }
        if(existUsers){
            for (let i = 0; i < existUsers.length; i++) {
                let user = existUsers[i];
                const userData = await userService.getByUserEmail(user.email.toLowerCase());
                user.joinedCourses.forEach(async(course) => { 
                    var email = { CourseId: course.courseId, organizationId: organizationId, UserId: userData.userId};
                    await organizationService.sendEmail(email, loggedInUser);
                });
            }
        }
    }

    return await knex
        .transaction(async t => {
            try {
                if(data){
                    for (let i = 0; i < data.length; i++) {
                        let user = data[i]
                        await InsertLearnerAsync(t, user);
                    }                    
                }
                if(exitData){
                    for (let i = 0; i < exitData.length; i++) {
                        let user = exitData[i]
                        await UpdateLearnerAsync(t, user);
                    }                    
                }  
                await t.commit(output);   
                await t.commit(update);   
                await sendUserCoursesEmail(exitData, data);     
            } catch (err) {
                console.log(err)
                await t.rollback(err)
            }
        })
}

async function update(loggedInUser, user, organizationId) {
    user = {
        ...user,
        email: user.email && user.email.toLowerCase() || user.email
    };

    organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;
    let validationOutput = await validateBulk(loggedInUser, [user], organizationId);

    if (validationOutput.hasErrors) {
        return {
            isValid: false,
            errorDetails: validationOutput.data.filter(t => t.error).map(t => t.error).join(',')
        };
    }

    return knex.transaction(async function (t) {
        await knex("users")
            .transacting(t)
            .where("user_id", user.userId)
            .update({
                name: user.name.trim(),
                surname: user.surname.trim(),
                gender: user.gender,
                start_date: user.startDate,
                email: user.email.trim(),
                is_active : user.isActive
            })
            .catch(error => console.log(error));

        if(user.password) {
            await knex("users")
            .transacting(t)
            .where("user_id", user.userId)
            .update({
                password: bcrypt.hashSync(user.password.trim(), 10)
            })
            .catch(error => console.log(error));
        }

        await knex("employees")
            .transacting(t)
            .where("user_id", user.userId)
            .update({
                is_active: user.isActive,
            })
            .catch(error => console.log(error));

        if (user.groupIds) {
            const insertgroupIds = user.groupIds.map(group => {
                return {
                    employee_id: user.employeeId,
                    group_id: group.groupId
                }
            });

            await knex('groups_employee').where('employee_id', user.employeeId).del().catch(error => console.log(error));
            await knex('groups_employee')
                .insert(insertgroupIds)
                .catch(error => console.log(error));
        }

        return {
            user : user,
            userId: user.userId,
            courses: user.joinedCourses,
            isActive: user.isActive,
            isValid: true
        };
    });
}

async function validateBulk(loggedInUser, usersData, organizationId) {
    usersData = usersData.map(d => ({
        ...d,
        email: d.email && d.email.toLowerCase().trim() || d.email
    }));

    organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;

    let groups = await groupsvc.getAllGroupsIds(organizationId).then(r => {
        return r;
    });

    let courses = await coursessvc.getAllCoursesIds(organizationId).then(r => {
        return r;
    });

    let domain;
    let organization = await organizationService.getById(organizationId);

    if (organization && organization.domain) {
        domain = "@" + organization.domain;
    }

    let output = {
        hasErrors: false,
        numOfRecordsInvalid: 0,
        data: []
    };

    let emails = [];

    function addError(userData, error) {
        output.data.push({...userData, status: "error", error});
        output.numOfRecordsInvalid = output.numOfRecordsInvalid + 1;
    }

    for (let i = 0; i < usersData.length; i++) {
        let user = usersData[i];

        if (!user.name || !user.name.trim()) {
            addError(user, "Name is empty");
            continue;
        }

        if (!user.gender) {
            addError(user, "Gender is empty");
            continue;
        }

        if (!user.startDate) {
            addError(user, "Start date is not defined");
            continue;
        }

        if (user.gender != 'M' && user.gender != 'F') {
            addError(user, "Gender is not valid");
            continue;
        }

        if (!user.surname || !user.surname.trim()) {
            addError(user, "Surname is empty");
            continue;
        }

        if (user.groupNames && (user.groupNames.length > 0 && user.groupNames[0] )) {
            if (!groups || groups.length === 0) {
                addError(user, "Groups '" + user.groupNames + "' are not valid");
                continue;
            }

            let valid = true; //holds validation state for all groups

            let validatedGroups = []
            let invalidGroupsNames = []

            await user.groupNames.forEach(userGroupName => {

                let validatedGroup = {}

                let validLocal = false //helper variable, holds validatoin status for single group

                for (let group of groups) {
                    if (group.name.trim() === userGroupName.trim()) {
                        validatedGroup.groupId = group.groupId
                        validatedGroup.name = group.name
                        validLocal = true
                        break
                    }
                }

                valid = validLocal && valid

                if (!validLocal) {
                    invalidGroupsNames.push(userGroupName)
                }else{
                    validatedGroups.push(validatedGroup)
                }
            })

            usersData[i].groupIds = validatedGroups

            if (!valid) {
                addError(user, "Groups '" + invalidGroupsNames + "' are not valid");
                continue
            }
        }       

        if (user.courseCodes && (user.courseCodes.length > 0 && user.courseCodes[0])) {

            if (!courses || courses.length === 0) {
                addError(user, "Courses '" + user.courseCodes + "' are not valid");
                continue;
            }

            let valid = true; //holds validation state for all groups

            let validatedCourses = []
            let invalidCoursesCodes = []

            await user.courseCodes.forEach(courseCode => {

                let validatedCourse = {}

                let validLocal = false //helper variable, holds validatoin status for single group

                for (let course of courses) {
                    if ((course.courseCode && course.courseCode.trim()) === (courseCode && courseCode.trim())) {
                        validatedCourse.courseId = course.courseId;
                        validatedCourse.name = course.name;
                        validatedCourse.courseCode = course.courseCode;
                        validLocal = true;
                        break
                    }
                }

                validatedCourses.push(validatedCourse)
                valid = validLocal && valid

                if (!validLocal) {
                    invalidCoursesCodes.push(courseCode)
                }
            })

            usersData[i].joinedCourses = validatedCourses

            if (!valid) {
                addError(user, "Courses '" + invalidCoursesCodes + "' are not valid");
                continue
            }
        }

        if (!user.email) {
            addError(user, "Email is empty");
            continue;
        }

        if (emails.indexOf(user.email) >= 0) {
            addError(user, "The same email already defined in the file");
            continue;
        }

        if (!validator.validate(user.email)) {
            addError(user, "The format of the email address isn't correct");
            continue;
        }

        let userEmailDomain = user.email.substring(user.email.indexOf('@'));
        if (domain && userEmailDomain.toLowerCase() !== domain.toLowerCase()) {
            addError(user, "The domain of the email address isn't correct");
            continue;
        }

        emails.push(user.email);

        let emailExists = await checkIfEmailExists(user.email, user.userId);
        if (emailExists) {
            addError(user, "Email already exists");
            continue;
        }       

        output.data.push({...user, status: "ok"});
    }

    output.hasErrors = output.numOfRecordsInvalid > 0;

    return output;
}
