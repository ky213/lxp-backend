const Permissions = require("../../permissions/permissions")

exports.up = async function (knex) {

    await knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.lessons.get,
        Permissions.api.lessons.create,
        Permissions.api.lessons.update,
        Permissions.api.lessons.delete
    ],'Admin']);

    await knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.lessons.get,
        Permissions.api.lessons.create,
        Permissions.api.lessons.update,
        Permissions.api.lessons.delete
    ],'LearningManager']);

    await knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.lessons.get,
        Permissions.api.lessons.create,
        Permissions.api.lessons.update,
        Permissions.api.lessons.delete
    ],'ProgramDirector']);

    await knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.lessons.get,
        Permissions.api.lessons.create,
        Permissions.api.lessons.update,
        Permissions.api.lessons.delete
    ],'CourseManager']);

    return knex.raw('update roles set permissions = array_cat(permissions,?) where role_id = ?',[[
        Permissions.api.lessons.get,
    ],'Learner']);
        
};

exports.down = function(knex) {
    return null;
};
