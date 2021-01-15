const Permissions = require("../../permissions/permissions")

exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('roles').del()
    .then(async function () {
      // Inserts seed entries
      await knex('roles')
      .insert([
        {role_id: 'Admin', name: 'Administrator'},
        {role_id: 'SuperAdmin', name: 'Super Administrator (admin of admins)'},
        {role_id: 'LearningManager', name: 'Learning  Manager'},
        {role_id: 'ProgramDirector', name: 'Program Manager'},
        {role_id: 'CourseManager', name: 'Course Manager'},
        {role_id: 'Learner', name: 'Learner'}
      ]);


        await knex('roles').where({role_id: 'Admin'}).update({
            'global': true,
            'permissions': [
                Permissions.api.users.bulk.update,
                Permissions.api.learners.create,
                Permissions.api.learners.bulk.create,
                Permissions.api.learners.bulk.validate,
                Permissions.api.learners.update,
                Permissions.api.courseManagers.create,
                Permissions.api.courseManagers.bulk.create,
                Permissions.api.courseManagers.bulk.validate,
                Permissions.api.courseManagers.update,
                Permissions.api.courseManagers.get.adminaccess,
                Permissions.api.employeeRoles.get,
                Permissions.api.organizations.create,
                Permissions.api.organizations.get.adminaccess,
                Permissions.api.organizations.update,
                Permissions.api.organizations.delete,
                Permissions.api.organizations.email.send,
                Permissions.api.programs.create,
                Permissions.api.programs.update,
                Permissions.api.programs.get.adminaccess,
                Permissions.api.programs.delete,
                Permissions.api.activityTypes.create,
                Permissions.api.activityTypes.update,
                Permissions.api.activityTypes.get.adminaccess,
                Permissions.api.activityTypes.get.useraccess,
                Permissions.api.activityTypes.delete,

                Permissions.api.users.get,
                Permissions.api.users.password.update,
                Permissions.api.users.update,
                Permissions.api.users.delete,
                Permissions.api.users.certificate.get,

                Permissions.api.learners.get,

                Permissions.api.courseManagers.get.useraccess,

                Permissions.api.programs.get.useraccess,

                Permissions.api.organizations.assetsDomain.get,

                Permissions.api.academicYears.get.useraccess,
                Permissions.api.academicYears.create,
                Permissions.api.academicYears.update,
                Permissions.api.academicYears.delete,

                Permissions.api.calendar.update,
                Permissions.api.calendar.create,
                Permissions.api.calendar.get,

                Permissions.api.activities.create,
                Permissions.api.activities.update,
                Permissions.api.activities.get,
                Permissions.api.activities.adminaccess,
                Permissions.api.activities.delete,
                Permissions.api.activities.files.get,
                Permissions.api.activities.files.upload,

                Permissions.api.experienceLevels.get,
                Permissions.api.experienceLevels.create,
                Permissions.api.experienceLevels.update,
                Permissions.api.experienceLevels.delete,

                Permissions.api.announcements.get,
                Permissions.api.announcements.create,
                Permissions.api.announcements.update,
                Permissions.api.announcements.delete,

                Permissions.api.courses.get,
                Permissions.api.courses.create,
                Permissions.api.courses.update,
                Permissions.api.courses.delete,

                Permissions.api.notifications.create,
                Permissions.api.notifications.get,
                Permissions.api.notifications.update,

                Permissions.api.xapi.statements.get,

                Permissions.api.groupTypes.create,
                Permissions.api.groupTypes.update,
                Permissions.api.groupTypes.get,
                Permissions.api.groupTypes.delete,

                Permissions.api.groups.create,
                Permissions.api.groups.get,
                Permissions.api.groups.update,
                Permissions.api.groups.delete,

                Permissions.api.dashboards.get,

                Permissions.api.competencyType.create,
                Permissions.api.competencyType.update,
                Permissions.api.competencyType.get,
                Permissions.api.competencyType.delete,

                Permissions.api.competencies.create,
                Permissions.api.competencies.update,
                Permissions.api.competencies.get,
                Permissions.api.competencies.delete
            ]
        });
        await knex('roles').where({role_id: 'SuperAdmin'}).update({
            'global': true,
            'permissions': [
                Permissions.api.superadmins.isSuperAdmin, //gives access to every endpoint
                Permissions.api.organizations.get.superadminaccess,
                Permissions.api.superadmins.get,
                Permissions.api.superadmins.create,
                Permissions.api.superadmins.update,

                Permissions.api.users.get,
                Permissions.api.users.password.update,
                Permissions.api.users.update,
                Permissions.api.users.delete,
                Permissions.api.users.certificate.get,

                Permissions.api.learners.get,

                Permissions.api.courseManagers.get.useraccess,

                Permissions.api.programs.get.useraccess,

                Permissions.api.organizations.assetsDomain.get,

                Permissions.api.academicYears.get.useraccess,
                Permissions.api.academicYears.create,
                Permissions.api.academicYears.update,
                Permissions.api.academicYears.delete,

                Permissions.api.calendar.update,
                Permissions.api.calendar.create,
                Permissions.api.calendar.get,

                Permissions.api.activities.create,
                Permissions.api.activities.update,
                Permissions.api.activities.get,
                Permissions.api.activities.adminaccess,
                Permissions.api.activities.delete,
                Permissions.api.activities.files.get,
                Permissions.api.activities.files.upload,

                Permissions.api.activityTypes.get.adminaccess,
                Permissions.api.activityTypes.get.useraccess,
                Permissions.api.activityTypes.delete,

                Permissions.api.experienceLevels.get,
                Permissions.api.experienceLevels.create,
                Permissions.api.experienceLevels.update,
                Permissions.api.experienceLevels.delete,

                Permissions.api.announcements.get,
                Permissions.api.announcements.create,
                Permissions.api.announcements.update,
                Permissions.api.announcements.delete,

                Permissions.api.courses.get,
                Permissions.api.courses.create,
                Permissions.api.courses.update,
                Permissions.api.courses.delete,

                Permissions.api.notifications.create,
                Permissions.api.notifications.get,
                Permissions.api.notifications.update,

                Permissions.api.xapi.statements.get,

                Permissions.api.groupTypes.create,
                Permissions.api.groupTypes.update,
                Permissions.api.groupTypes.get,
                Permissions.api.groupTypes.delete,

                Permissions.api.groups.create,
                Permissions.api.groups.get,
                Permissions.api.groups.update,
                Permissions.api.groups.delete,

                Permissions.api.dashboards.get,

                Permissions.api.competencyType.create,
                Permissions.api.competencyType.update,
                Permissions.api.competencyType.get,
                Permissions.api.competencyType.delete,

                Permissions.api.competencies.create,
                Permissions.api.competencies.update,
                Permissions.api.competencies.get,
                Permissions.api.competencies.delete
            ]
        });
        await knex('roles').where({role_id: 'LearningManager'}).update({
            'global': true,
            'permissions': [
                Permissions.api.users.bulk.update,
                Permissions.api.learners.create,
                Permissions.api.learners.bulk.create,
                Permissions.api.learners.bulk.validate,
                Permissions.api.learners.update,
                Permissions.api.courseManagers.create,
                Permissions.api.courseManagers.bulk.create,
                Permissions.api.courseManagers.bulk.validate,
                Permissions.api.courseManagers.get.adminaccess,
                Permissions.api.courseManagers.update,
                Permissions.api.employeeRoles.get,
                Permissions.api.organizations.create,
                Permissions.api.organizations.get.adminaccess,
                Permissions.api.organizations.update,
                Permissions.api.organizations.delete,
                Permissions.api.organizations.email.send,
                Permissions.api.programs.create,
                Permissions.api.programs.update,
                Permissions.api.programs.get.adminaccess,
                Permissions.api.programs.delete,
                Permissions.api.activityTypes.create,
                Permissions.api.activityTypes.update,
                Permissions.api.activityTypes.get.adminaccess,
                Permissions.api.activityTypes.get.useraccess,
                Permissions.api.activityTypes.delete,

                Permissions.api.users.get,
                Permissions.api.users.password.update,
                Permissions.api.users.update,
                Permissions.api.users.delete,
                Permissions.api.users.certificate.get,

                Permissions.api.learners.get,

                Permissions.api.courseManagers.get.useraccess,

                Permissions.api.programs.get.useraccess,

                Permissions.api.organizations.assetsDomain.get,

                Permissions.api.academicYears.get.useraccess,
                Permissions.api.academicYears.create,
                Permissions.api.academicYears.update,
                Permissions.api.academicYears.delete,

                Permissions.api.calendar.update,
                Permissions.api.calendar.create,
                Permissions.api.calendar.get,

                Permissions.api.activities.create,
                Permissions.api.activities.update,
                Permissions.api.activities.get,
                Permissions.api.activities.adminaccess,
                Permissions.api.activities.delete,
                Permissions.api.activities.files.get,
                Permissions.api.activities.files.upload,

                Permissions.api.experienceLevels.get,
                Permissions.api.experienceLevels.create,
                Permissions.api.experienceLevels.update,
                Permissions.api.experienceLevels.delete,

                Permissions.api.announcements.get,
                Permissions.api.announcements.create,
                Permissions.api.announcements.update,
                Permissions.api.announcements.delete,

                Permissions.api.courses.get,
                Permissions.api.courses.create,
                Permissions.api.courses.update,
                Permissions.api.courses.delete,

                Permissions.api.notifications.create,
                Permissions.api.notifications.get,
                Permissions.api.notifications.update,

                Permissions.api.xapi.statements.get,

                Permissions.api.groupTypes.create,
                Permissions.api.groupTypes.update,
                Permissions.api.groupTypes.get,
                Permissions.api.groupTypes.delete,

                Permissions.api.groups.create,
                Permissions.api.groups.get,
                Permissions.api.groups.update,
                Permissions.api.groups.delete,

                Permissions.api.dashboards.get,

                Permissions.api.competencyType.create,
                Permissions.api.competencyType.update,
                Permissions.api.competencyType.get,
                Permissions.api.competencyType.delete,

                Permissions.api.competencies.create,
                Permissions.api.competencies.update,
                Permissions.api.competencies.get,
                Permissions.api.competencies.delete
            ]
        });
        await knex('roles').where({role_id: 'ProgramDirector'}).update({
            'global': true,
            'permissions': [
                Permissions.api.users.bulk.update,
                Permissions.api.learners.create,
                Permissions.api.learners.bulk.create,
                Permissions.api.learners.bulk.validate,
                Permissions.api.learners.update,
                Permissions.api.programs.create,
                Permissions.api.programs.update,
                Permissions.api.programs.get.adminaccess,
                Permissions.api.programs.delete,
                Permissions.api.activityTypes.create,
                Permissions.api.activityTypes.update,
                Permissions.api.activityTypes.get.adminaccess,
                Permissions.api.activityTypes.get.useraccess,
                Permissions.api.activityTypes.delete,

                Permissions.api.users.get,
                Permissions.api.users.password.update,
                Permissions.api.users.update,
                Permissions.api.users.delete,
                Permissions.api.users.certificate.get,

                Permissions.api.learners.get,

                Permissions.api.courseManagers.get.useraccess,

                Permissions.api.programs.get.useraccess,

                Permissions.api.organizations.assetsDomain.get,

                Permissions.api.academicYears.get.useraccess,
                Permissions.api.academicYears.create,
                Permissions.api.academicYears.update,
                Permissions.api.academicYears.delete,

                Permissions.api.calendar.update,
                Permissions.api.calendar.create,
                Permissions.api.calendar.get,

                Permissions.api.activities.create,
                Permissions.api.activities.update,
                Permissions.api.activities.get,
                Permissions.api.activities.adminaccess,
                Permissions.api.activities.delete,
                Permissions.api.activities.files.get,
                Permissions.api.activities.files.upload,

                Permissions.api.experienceLevels.get,
                Permissions.api.experienceLevels.create,
                Permissions.api.experienceLevels.update,
                Permissions.api.experienceLevels.delete,

                Permissions.api.announcements.get,
                Permissions.api.announcements.for.programmanegers,
                Permissions.api.announcements.create,
                Permissions.api.announcements.update,
                Permissions.api.announcements.delete,

                Permissions.api.courses.get,
                Permissions.api.courses.create,
                Permissions.api.courses.update,
                Permissions.api.courses.delete,

                Permissions.api.notifications.create,
                Permissions.api.notifications.get,
                Permissions.api.notifications.update,

                Permissions.api.xapi.statements.get,

                Permissions.api.groupTypes.create,
                Permissions.api.groupTypes.update,
                Permissions.api.groupTypes.get,
                Permissions.api.groupTypes.delete,

                Permissions.api.groups.create,
                Permissions.api.groups.get,
                Permissions.api.groups.update,
                Permissions.api.groups.delete,

                Permissions.api.dashboards.get,

                Permissions.api.competencyType.create,
                Permissions.api.competencyType.update,
                Permissions.api.competencyType.get,
                Permissions.api.competencyType.delete,

                Permissions.api.competencies.create,
                Permissions.api.competencies.update,
                Permissions.api.competencies.get,
                Permissions.api.competencies.delete
            ]
        });
        await knex('roles').where({role_id: 'CourseManager'}).update({
            'global': true,
            'permissions': [
                Permissions.api.users.get,
                Permissions.api.users.password.update,
                Permissions.api.users.update,
                Permissions.api.users.delete,
                Permissions.api.users.certificate.get,

                Permissions.api.learners.get,

                Permissions.api.courseManagers.get.useraccess,

                Permissions.api.programs.get.useraccess,

                Permissions.api.organizations.assetsDomain.get,

                Permissions.api.academicYears.get.useraccess,
                Permissions.api.academicYears.create,
                Permissions.api.academicYears.update,
                Permissions.api.academicYears.delete,

                Permissions.api.calendar.update,
                Permissions.api.calendar.create,
                Permissions.api.calendar.get,

                Permissions.api.activities.create,
                Permissions.api.activities.update,
                Permissions.api.activities.get,
                Permissions.api.activities.adminaccess,
                Permissions.api.activities.delete,
                Permissions.api.activities.files.get,
                Permissions.api.activities.files.upload,

                Permissions.api.activityTypes.get.useraccess,

                Permissions.api.experienceLevels.get,
                Permissions.api.experienceLevels.create,
                Permissions.api.experienceLevels.update,
                Permissions.api.experienceLevels.delete,

                Permissions.api.announcements.get,
                Permissions.api.announcements.create,
                Permissions.api.announcements.update,
                Permissions.api.announcements.delete,

                Permissions.api.courses.get,
                Permissions.api.courses.create,
                Permissions.api.courses.update,
                Permissions.api.courses.delete,

                Permissions.api.notifications.create,
                Permissions.api.notifications.get,
                Permissions.api.notifications.update,

                Permissions.api.xapi.statements.get,

                Permissions.api.groupTypes.create,
                Permissions.api.groupTypes.update,
                Permissions.api.groupTypes.get,
                Permissions.api.groupTypes.delete,

                Permissions.api.groups.create,
                Permissions.api.groups.get,
                Permissions.api.groups.update,
                Permissions.api.groups.delete,

                Permissions.api.dashboards.get,

                Permissions.api.competencyType.create,
                Permissions.api.competencyType.update,
                Permissions.api.competencyType.get,
                Permissions.api.competencyType.delete,

                Permissions.api.competencies.create,
                Permissions.api.competencies.update,
                Permissions.api.competencies.get,
                Permissions.api.competencies.delete
            ]
        });

        return knex.raw('update roles set global = true, permissions = ? where role_id = ?',[[
                Permissions.api.users.get,
                Permissions.api.users.password.update,
                Permissions.api.users.update,
                Permissions.api.users.delete,
                Permissions.api.users.certificate.get,

                Permissions.api.learners.get,

                Permissions.api.courseManagers.get.useraccess,

                Permissions.api.programs.get.useraccess,

                Permissions.api.organizations.assetsDomain.get,

                Permissions.api.academicYears.get.useraccess,
                Permissions.api.academicYears.create,
                Permissions.api.academicYears.update,
                Permissions.api.academicYears.delete,

                Permissions.api.calendar.update,
                Permissions.api.calendar.create,
                Permissions.api.calendar.get,

                Permissions.api.activities.create,
                Permissions.api.activities.update,
                Permissions.api.activities.get,
                Permissions.api.activities.useraccess,
                Permissions.api.activities.delete,
                Permissions.api.activities.files.get,
                Permissions.api.activities.files.upload,

                Permissions.api.activityTypes.get.useraccess,

                Permissions.api.experienceLevels.get,
                Permissions.api.experienceLevels.create,
                Permissions.api.experienceLevels.update,
                Permissions.api.experienceLevels.delete,

                Permissions.api.announcements.get,
                Permissions.api.announcements.for.learners,
                Permissions.api.announcements.create,
                Permissions.api.announcements.update,
                Permissions.api.announcements.delete,

                Permissions.api.courses.get,
                Permissions.api.courses.create,
                Permissions.api.courses.update,
                Permissions.api.courses.delete,

                Permissions.api.notifications.create,
                Permissions.api.notifications.get,
                Permissions.api.notifications.update,

                Permissions.api.xapi.statements.get,

                Permissions.api.groupTypes.create,
                Permissions.api.groupTypes.update,
                Permissions.api.groupTypes.get,
                Permissions.api.groupTypes.delete,

                Permissions.api.groups.create,
                Permissions.api.groups.get,
                Permissions.api.groups.update,
                Permissions.api.groups.delete,

                Permissions.api.dashboards.get,

                Permissions.api.competencyType.create,
                Permissions.api.competencyType.update,
                Permissions.api.competencyType.get,
                Permissions.api.competencyType.delete,

                Permissions.api.competencies.create,
                Permissions.api.competencies.update,
                Permissions.api.competencies.get,
                Permissions.api.competencies.delete
            ],'Learner'])

    });
};
