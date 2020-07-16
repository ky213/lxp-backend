const bcrypt = require('bcrypt');

exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('organizations').del()
    .then(() => {
      // Inserts seed entries
      return knex('organizations').insert([
        {name: 'Primary organization', background_color_code: '#1EB7FF', color_code: '#FFFFFF', created_by: 'sys', modified_by: 'sys'}
      ]).returning('organization_id')
      .then((organizationIds) => {
        return knex('users').del()
        .then(() => {
          return knex('users').insert([
            {email: 'damir.eb@gmail.com', name: 'Damir', surname: 'Kovačević',  password: bcrypt.hashSync('admin', 10), is_super_admin: 1},
            {email: 'nebojsa.pongracic@gmail.com', name: 'Nebojša', surname: 'Pongračić', password: bcrypt.hashSync('admin', 10), is_super_admin: 1},
            {email: 'ivbambic@gmail.com', name: 'Ivan', surname: 'Bambić', password: bcrypt.hashSync('admin', 10), is_super_admin: 1}
          ]).returning('user_id')
          .then((userIds) => {
            let employeeList = [];
            organizationIds.forEach((organizationId) => {
              userIds.forEach((userId) => {
                employeeList.push({user_id: userId, is_resident: false, organization_id: organizationId, profile_photo: null});
              });
            });

            return knex('employees').insert(employeeList);
          });    
        });

      });    
    });
};
