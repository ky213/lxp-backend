exports.up = async function (knex) {
    await knex.schema.createTable('roles', table => {
        table.string('role_id', 30).notNullable().primary();
        table.string('name', 60).notNullable();
    }).then(()=>{
        return knex('roles').insert([
            {role_id: 'Admin', name: 'Administrator'},
            {role_id: 'SuperAdmin', name: 'Super Administrator (admin of admins)'},
            {role_id: 'LearningManager', name: 'Learning  Manager'},
            {role_id: 'ProgramDirector', name: 'Program Manager'},
            {role_id: 'CourseManager', name: 'Course Manager'},
            {role_id: 'Learner', name: 'Learner'}
        ]);
    })

};

exports.down = function (knex) {
    return knex.schema.dropTable('roles');
};
