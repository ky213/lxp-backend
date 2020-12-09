const bcrypt = require("bcrypt");
const knex = require("../db");
const validator = require("email-validator");
const {checkIfEmailExists} = require("./user.service");
const {getCmRoles} = require("../roles/role.service");
const groupsvc = require("../groups/groups.service");
const organizationService = require("../organizations/organization.service");
const programService = require('../programs/program.service');
var generator = require('generate-password');
const Role = require("helpers/role");

let cmRolesP = async function () {
    return await getCmRoles().then(r => {
        cmRoles = r;
    });
}()

var cmRoles = []

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

    organizationId = (loggedInUser.role === Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

    let validationOutput = await validateBulk(
        loggedInUser,
        [userData],
        organizationId
    );

    if (validationOutput.hasErrors) {
        return {
            isValid: false,
            errorDetails: validationOutput.data
                .filter(t => t.error)
                .map(t => t.error)
                .join(",")
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
                exp_level_id: null,
                is_learner: false
            }));

            const employeeIds = await knex("employees")
                .transacting(t)
                .insert(_employees)
                .returning("employee_id");

            let _employeeGroups = userData.groupIds.map(group => ({
                employee_id: employeeIds[0],
                group_id: group.groupId
            }));

            await knex("groups_employee")
                .transacting(t)
                .insert(_employeeGroups)
                .returning("group_id");

            await knex("employee_roles")
                .transacting(t)
                .insert({
                    employee_id: employeeIds[0],
                    role_id: userData.roleId
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
                isValid: true
            };
        })
        .catch(error => {
            return {
                isValid: false,
                errorDetails: error
            };
        });
}

async function addBulk(loggedInUser, data, organizationId) {
    data = data.map(d => ({
        ...d,
        email: d.email && d.email.toLowerCase() || d.email
    }));

    organizationId = (loggedInUser.role === Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;


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


    async function InsertUserAsync(t, userData) {
        var password = generator.generate({length: 10, numbers: true});
        usersIds = await t.into("users")
            .insert({
                name: userData.name,
                surname: userData.surname,
                email: userData.email,
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
                throw err;
            });


        let _employees = usersIds.map(userId => ({
            user_id: userId,
            organization_id: organizationId,
            exp_level_id: null,
            is_learner: false
        }))


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
                throw err;
            });

        let employeeRoles = employeesIds.map(employeeId => ({
            employee_id: employeeId,
            role_id: userData.roleId
        }))


        await t.into("employee_roles")
            .insert(employeeRoles)
            .then(r => {
                console.log("employee_roles created")
            })
            .catch(err => {
                console.log(err);
                output.push({...userData, isValid: false, status: "error", errorDetails: err});
                throw err;
            });


        if (userProgram && userProgram.programId) {

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
                    throw err;
                });
        }

        if (userData.groupIds && userData.groupIds.length > 0) {


            let inserts = [];

            userData.groupIds.forEach(group => {

                let employeeGroups = employeesIds.map(employeeId => ({
                    employee_id: employeeId,
                    group_id: group.groupId
                }));

                var insertEmployeeGroups = (emplGroups) => {
                    t.into("groups_employee")
                        .insert(emplGroups)
                        .then(r => {
                            console.log("groups_employee created")
                        })
                        .catch(err => {
                            console.log(err);
                            output.push({...userData, isValid: false, status: "error", errorDetails: err});
                            throw err;
                        });
                }

                inserts.push(insertEmployeeGroups(employeeGroups))

            });

            Promise.all(inserts)
                .then(() => {
                    console.log('Employee groups will be persisted while commit.');
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
                        throw err;
                    });
            }

        }

        var email = {
            UserEmail: userData.email.trim(), UserPass: password, UserLastName: userData.surname.trim(),
            UserName: userData.name.trim(), organizationId: organizationId
        };
        await organizationService.sendEmail(email, loggedInUser);


        output.push({...userData, status: "ok"});

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

    organizationId = (loggedInUser.role === Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

    let validationOutput = await validateBulk(loggedInUser, [user], organizationId);
    if (validationOutput.hasErrors) {
        return {
            isValid: false,
            errorDetails: validationOutput.data
                .filter(t => t.error)
                .map(t => t.error)
                .join(",")
        };
    }

    let roleCount = await knex("employee_roles")
        .where("employee_id", user.employeeId)
        .count();
    let roleExists = roleCount[0].count > 0;

    let updateRoleQuery = null;

    return knex.transaction(async function (t) {
        if (roleExists && user.roleId) {
            updateRoleQuery = knex("employee_roles")
                .transacting(t)
                .where("employee_id", user.employeeId)
                .update({
                    role_id: user.roleId
                });
        } else if (roleExists && !user.roleId) {
            updateRoleQuery = knex("employee_roles")
                .transacting(t)
                .where("employee_id", user.employeeId)
                .del();
        } else if (!roleExists && user.roleId) {
            updateRoleQuery = knex("employee_roles")
                .transacting(t)
                .where("employee_id", user.employeeId)
                .insert({
                    role_id: user.roleId,
                    employee_id: user.employeeId
                });
        }

        await knex.transaction(async function (t) {
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

            if(user.password) {
                await knex("users")
                .transacting(t)
                .where("user_id", user.userId)
                .update({
                    password: bcrypt.hashSync(user.password.trim(), 10)
                })
                .catch(error => console.log(error));
            }    

            return knex("employees")
                .transacting(t)
                .where("employee_id", user.employeeId)
                .update({
                    is_active: user.isActive,
                    organization_id: user.organizationId
                });
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

        await updateRoleQuery;

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

    organizationId = (loggedInUser.role === Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;


    let groups = await groupsvc.getAllGroupsIds(organizationId).then(r => {
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

        if (!user.surname) {
            addError(user, "Surname is empty");
            continue;
        }

        if (!user.email) {
            addError(user, "Email is empty");
            continue;
        }

        if (!user.gender) {
            addError(user, "Gender is empty");
            continue;
        }

        if (user.gender !== 'M' && user.gender !== 'F') {
            addError(user, "Gender is not valid");
            continue;
        }

        // For CM StartDate is not mandatory
        // if (!user.startDate) {
        //   addError(user, "Start date is not defined");
        //   continue;
        // }

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

        let emailExist = await checkIfEmailExists(user.email, user.userId);
        if (emailExist) {
            addError(user, "Email already exists");
            continue;
        }

        if (!user.roleId) {
            addError(user, "Role is empty");
            continue;
        }

        if (cmRoles) {
            let valid = false;
            cmRoles.forEach(item => {
                if (item.roleId === user.roleId || item.name === user.roleId) {
                    valid = true;
                    usersData[i].roleId = item.roleId;
                    usersData[i].roleName = item.name;
                }
            })

            if (!valid) {
                addError(user, "Role is not valid");
                continue;
            }
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
                    if (group.name === userGroupName) {
                        validatedGroup.groupId = group.groupId
                        validatedGroup.name = group.name
                        validLocal = true
                        break
                    }
                }

                validatedGroups.push(validatedGroup)
                valid = validLocal && valid

                if (!validLocal) {
                    invalidGroupsNames.push(userGroupName)
                }
            })

            usersData[i].groupIds = validatedGroups

            if (!valid) {
                addError(user, "Groups '" + invalidGroupsNames + "' are not valid");
                continue
            }

        }


        if (user.organizationId) {
            const exists = organizationService.getById(organizationId, loggedInUser);
            if (!exists || (exists && exists.length === 0)) {
                addError(user, "Specified organization does not exist");
                continue;
            }
        }

        output.data.push({...user, status: "ok"});
    }

    output.hasErrors = output.numOfRecordsInvalid > 0;

    return output;
}
