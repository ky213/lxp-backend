const bcrypt = require("bcrypt");
const knex = require("../db");
const Role = require("helpers/role");
const {checkIfEmailExists} = require("./user.service");
const programService = require('../programs/program.service');
const organizationService = require('../organizations/organization.service');

let defaultPassword = "admin";

module.exports = {
    add,
    addBulk,
    update,
    validateBulk
};

async function add(loggedInUser, userData, organizationId) {
    userData = {
        ...userData,
        email: userData.email && userData.email.toLowerCase() || userData.email
    };

    organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

    let validationOutput = await validateBulk(loggedInUser, [userData], organizationId);
    if (validationOutput.hasErrors) {
        return {
            isValid: false,
            errorDetails: validationOutput.data.filter(t => t.error).map(t => t.error).join(',')
        };
    }

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
                    password: bcrypt.hashSync(defaultPassword, 10)
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
                        return {
                            isValid: false,
                            status: "error",
                            errorDetails: err
                        };
                    });
            }

            await knex("employee_roles")
                .transacting(t)
                .insert({
                    employee_id: employeeIds[0],
                    role_id: Role.Learner
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

            return {
                isValid: true
            };
        })
        .catch(err => console.log("err", err));
}

async function addBulk(loggedInUser, data, organizationId) {

    data = data.map(d => ({
        ...d,
        email: d.email && d.email.toLowerCase() || d.email
    }));

    organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

    let inserts = [];
    let output = [];
    let validationOutput = await validateBulk(loggedInUser, data, organizationId);

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


    async function InsertLearnerAsync(t, userData) {

        usersIds = await t.into("users")
            .insert({
                name: userData.name.trim(),
                surname: userData.surname.trim(),
                email: userData.email.trim(),
                gender: userData.gender,
                start_date: userData.startDate,
                password: bcrypt.hashSync(defaultPassword, 10)
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

        let _employees = userIds.map(userId => {
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
                return userIds;
            })
            .catch(err => {
                console.log(err);
                output.push({...userData, isValid: false, status: "error", errorDetails: err});
                throw  err;
            });

        let employeeRoles = employeeIds.map(employeeId => ({
            employee_id: employeeId,
            role_id: Role.Learner
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
            let employeePrograms = employeeIds.map(employeeId => ({
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
                let employeeGroups = employeeIds.map(employeeId => ({
                    employee_id: employeeId,
                    group_id: group
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
                    console.log('Committing employee groups.');
                    return t.commit(output);
                })
                .catch(err => {
                    console.log('Rollback. Because:', err);
                    t.rollback(output);
                    throw err;
                });

        } else {

            if (defaultGroup && defaultGroup.defaultGroupId) {
                let employeeGroups = employeeIds.map(employeeId => ({
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

        }


        // end if groups

        if (userData.joinedCourses && userData.joinedCourses.length > 0) {

            let inserts = [];
            userData.joinedCourses.forEach(course => {
                let insertUserCourse = userIds.map(userId => ({
                    user_id: userId,
                    is_able_to_join: true,
                    course_id: course,
                    joining_date: knex.fn.now()
                }));


                var insert = (userCourse) => {
                    t.into("user_courses")
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
                    console.log('Committing user courses.');
                    return t.commit(output);
                })
                .catch(err => {
                    console.log('Rollback. Because:', err);
                    t.rollback(output);
                    throw err;
                });

        }

        output.push({...userData, status: "ok"});
        return resolve();
    }


    return await knex
        .transaction(async t => {
            try {
                for (let i = 0; i < data.length; i++) {
                    let user = data[i]
                    await InsertUserAsync(t, user);
                }
                await t.commit(output)
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

    organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

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
                email: user.email.trim()
            });

        await knex("employees")
            .transacting(t)
            .where("user_id", user.userId)
            .update({
                is_active: user.isActive,
            });

        if (user.groupIds) {
            const insertgroupIds = user.groupIds.map(group => {
                return {
                    employee_id: user.employeeId,
                    group_id: group.groupId
                }
            });

            await knex('groups_employee').where('employee_id', user.employeeId).del();
            await knex('groups_employee')
                .insert(insertgroupIds);
        }

        if (user.joinedCourses) {
            const insertcourseIds = user.joinedCourses.map(course => {
                return {
                    user_id: user.userId,
                    is_able_to_join: true,
                    course_id: course.courseId,
                    joining_date: knex.fn.now()
                }
            });

            await knex('user_courses').where('user_id', user.userId).del();
            await knex('user_courses')
                .insert(insertcourseIds);
        }

        return {
            isValid: true
        };
    });
}

async function validateBulk(loggedInUser, usersData, organizationId) {
    usersData = usersData.map(d => ({
        ...d,
        email: d.email && d.email.toLowerCase().trim() || d.email
    }));

    organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

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

        if (!user.email) {
            addError(user, "Email is empty");
            continue;
        }

        if (emails.indexOf(user.email) >= 0) {
            addError(user, "The same email already defined in the file");
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
