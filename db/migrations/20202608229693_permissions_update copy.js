const Permissions = require("../../permissions/permissions")

exports.up = async function (knex) {

    await knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.programs.get.adminaccess
    ],'Admin']);

    await knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.programs.get.adminaccess
    ],'LearningManager']);

    await knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.programs.get.useraccess
    ],'CourseManager']);

    return knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.programs.get.useraccess
    ],'Learner']);
        
};

exports.down = function(knex) {
    return null;
};
