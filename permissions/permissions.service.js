
let permissions = {
    api: {

        users:{
            get: "api.users.get",
            update: "api.users.get",
            delete: "api.users.get",
            password : {
                update: "api.users.password.update",
            },
            certificate: {
                get: "api.users.certificate.get",
            },
            bulk:{
                update: "api.users.bulk.update"
            }

        },
        learners:{
           get: "api.learners.get",
           create: "api.learners.create",
           update: "api.learners.update",
           bulk: {
               create: "api.learners.bulk.create",
               validate: "api.learners.bulk.validate",
           },
        },
        courseManagers:{
            get: "api.cm.get",
            create: "api.cm.create",
            update: "api.cm.update",
            bulk: {
                create: "api.cm.bulk.create",
                validate: "api.cm.bulk.validate",
            }
        },
        superadmins:{
            get: "api.superadmins.get",
            create: "api.superadmins.create",
            update: "api.superadmins.update",
            isSuperAdmin: "api.superadmins.is.super.admin"
        },
        roles:{
            get: "api.roles.get",
            create: "api.roles.create",
            update: "api.roles.update",
        },
        employeeRoles:{
            get: "api.employeeRoles.get",
            create: "api.employeeRoles.create"
        },
        organizations:{
            create: "api.organizations.create",
            update: "api.organizations.update",
            delete: "api.organizations.delete",
            get: {
                useraccess: "api.organizations.get.useraccess",
                adminaccess: "api.organizations.get.adminaccess",
            },
            email:{
                send: "api.organizations.email.send",
            },
            assetsDomain:{
                get: "api.organizations.assetsDomain.get"
            }
        },
        programs:{
            create: "api.programs.create",
            update: "api.programs.update",
            get: {
                adminaccess:  "api.programs.get.admin-access",
                useraccess: "api.programs.get.user-access",
            },
            delete: "api.programs.delete",
        },
        academicYears:{
            get: {
                adminaccess: "api.academic.years.get.adminaccess"
            },
            create: "api.academic.years.create",
            update: "api.academic.years.update",
            delete: "api.academic.years.delete",
        },
        calendar:{
            update: "api.calendar.update",
            create: "api.calendar.create",
            get: "api.calendar.get",
        },
        activities:{
            create: "api.activities.create",
            update: "api.activities.update",
            get: "api.activities.get",
            delete: "api.activities.delete",
        },
        activityTypes:{
            create: "api.activity.types.create",
            update: "api.activity.types.update",
            get: "api.activity.types.get",
        },
        experienceLevels:{
            get: "api.experience.levels.get",
            create: "api.experience.levels.create",
            update: "api.experience.levels.update",
            delete: "api.experience.levels.delete",
        },
        announcements:{
            get: "api.announcements.get",
            create: "api.announcements.create",
            update: "api.announcements.update",
            delete: "api.announcements.delete",
        },
        courses:{
            get: "api.courses.get",
            delete: "api.courses.delete",
            create: "api.courses.create",
            update: "api.courses.update",
        },
        notifications:{
            create: "api.notifications.create",
            get: "api.notifications.get",
            update: "api.notifications.update",
        },
        groupTypes:{
            create: "api.groupTypes.create",
            update: "api.groupTypes.update",
            get: "api.groupTypes.get",
            delete: "api.groupTypes.delete",
        },
        groups:{
            create: "api.groups.create",
            update: "api.groups.update",
            get: "api.groups.get",
            delete: "api.groups.delete",
        },
        dashboards:{
            get: "api.groups.get",
        },
        competencyType:{
            create: "api.competency.type.create",
            update: "api.competency.type.update",
            get: "api.competency.type.get",
            delete: "api.competency.type.delete",
        },
        competencies:{
            create: "api.competencies.create",
            update: "api.competencies.update",
            get: "api.competencies.get",
            delete: "api.competencies.delete",
        },
        xapi:{

            statements:{
                get: "xapi.statements.get",
                create: "xapi.statements.create",
                update: "xapi.statements.update",
            },
            activitiesState:{
                get: "xapi.activities.state.get",
                create: "xapi.activities.state.create",
                update: "xapi.activities.state.update",
            },

        },
    }
}

module.export = permissions
