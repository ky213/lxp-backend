const bcrypt = require('bcrypt');

exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('institutes').del()
    .then(() => {
      // Inserts seed entries
      return knex('institutes').insert([
        {name: 'Primary institute', background_color_code: '#1EB7FF', color_code: '#FFFFFF', created_by: 'sys', modified_by: 'sys'}
      ]).returning('institute_id')
      .then((instituteIds) => {
        return knex('users').del()
        .then(() => {
          return knex('users').insert([
            {email: 'damir.eb@gmail.com', name: 'Damir', surname: 'Kovačević',  password: bcrypt.hashSync('admin', 10), is_super_admin: 1},
            {email: 'nebojsa.pongracic@gmail.com', name: 'Nebojša', surname: 'Pongračić', password: bcrypt.hashSync('admin', 10), is_super_admin: 1},
            {email: 'ivbambic@gmail.com', name: 'Ivan', surname: 'Bambić', password: bcrypt.hashSync('admin', 10), is_super_admin: 1}
          ]).returning('user_id')
          .then((userIds) => {
            let employeeList = [];
            instituteIds.forEach((instituteId) => {
              userIds.forEach((userId) => {
                employeeList.push({user_id: userId, is_resident: false, institute_id: instituteId, profile_photo: null});
              });
            });

            return knex('employees').insert(employeeList);
          });    
        });

      });    
    });
};
