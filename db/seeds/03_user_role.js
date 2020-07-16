const bcrypt = require("bcrypt");
   

exports.seed = async function(knex) {
  let organization = await knex('organizations')
    .where('name', 'Primary organization')
    .select('organization_id')
    .first();

    console.log('organization', organization);
  // Deletes ALL existing entries
  return knex.transaction(function(t) {
    return knex("users")
    .transacting(t)
    .insert([
      {
        email: "tomo@gmail.com",
        name: "Tomislav",
        surname: "Valentić",
        password: bcrypt.hashSync("admin", 10),
        is_super_admin: 0
      }
    ])
    .returning("user_id")
    .then(userIds => {
      let employeeList = [];
      userIds.forEach(userId => {
        employeeList.push({
          user_id: userId,
          organization_id: organization.organization_id,
          profile_photo: null,
          is_resident: false
        });
      });

      return knex("employees")
        .transacting(t)
        .insert(employeeList)
        .returning("employee_id")
        .then(employeeIds => {
          let employeeRoles = [];
          employeeIds.forEach(employeeId => {
            employeeRoles.push({
              employee_id: employeeId,
              role_id: 'Admin'
            });
          });

          return knex("employee_roles")
            .transacting(t)
            .insert(employeeRoles)
        })
        .then(t.commit)
        .catch(t.rollback)
    });

  });


  
};
