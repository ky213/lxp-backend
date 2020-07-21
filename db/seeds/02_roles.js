
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('roles').del()
    .then(function () {
      // Inserts seed entries
      return knex('roles')
      .insert([
        {role_id: 'Admin', name: 'Administrator'},
        {role_id: 'SuperAdmin', name: 'Super Administrator (admin of admins)'},
        {role_id: 'LearningManager', name: 'Learning  Manager'},
        {role_id: 'ProgramDirector', name: 'Program Manager'},
        {role_id: 'CourseManager', name: 'Course Manager'},
        {role_id: 'Learner', name: 'Learner'}
      ]);
    });
};
