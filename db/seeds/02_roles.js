
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('roles').del()
    .then(function () {
      // Inserts seed entries
      return knex('roles')
      .insert([
        {role_id: 'Admin', name: 'Institute Administrator'},
        //{role_id: 'SuperAdmin', name: 'Super Administrator (admin of admins)'},
        {role_id: 'InstituteManager', name: 'Institute Manager'},
        {role_id: 'ProgramDirector', name: 'Program Manager'},
        {role_id: 'FacultyMember', name: 'Faculty Member'},
        {role_id: 'Resident', name: 'Learner'}
      ]);
    });
};
