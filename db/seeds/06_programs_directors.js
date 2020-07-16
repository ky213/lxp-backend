const bcrypt = require("bcrypt");
   

exports.seed = async function(knex) {
  let organization = await knex('organizations')
    .where('name', 'Primary organization')
    .select('organization_id')
    .first();

  const program = await knex('programs')
    .where('name', 'Internal Medicine')
    .andWhere('organization_id', organization.organization_id)
    .select('program_id')
    .first();

    console.log("Got program:", program)

  return await knex.transaction(async function(t) {
    
    const users = await knex("users")
    .transacting(t)
    .insert([
      {
        email: "program.director@primaryorganization.com",
        name: "John",
        surname: "Smith",
        password: bcrypt.hashSync("test", 10),
        is_super_admin: 0
      }
    ])
    .returning("user_id");


    let employeeList = [];
    users.forEach(userId => {
        employeeList.push({
            user_id: userId,
            organization_id: organization.organization_id,
            profile_photo: null,
            is_resident: false
        });
    });

    const employees = await knex("employees")
        .transacting(t)
        .insert(employeeList)
        .returning("employee_id");

    let employeeRoles = [];
    employees.forEach(employeeId => {
        employeeRoles.push({
            employee_id: employeeId,
            role_id: 'ProgramDirector'
        });
    });

    await knex("employee_roles")
            .transacting(t)
            .insert(employeeRoles);


    let insertProgramDirectors = [];
    employees.forEach(employeeId => {
        insertProgramDirectors.push({
            program_id: program.program_id,
            employee_id: employeeId
        });
    });

    await knex('program_directors')
    .transacting(t)
    .insert(insertProgramDirectors);

    try {
        await t.commit();
    }
    catch(error) {
        console.log("Error while creating program directors: ", error)
        await t.rollback();
    }


  });
};
