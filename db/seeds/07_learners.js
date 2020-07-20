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
    
  const firstLevel = await knex('experience_levels')
    .where('level', 1)
    //.andWhere('program_id', program.program_id)
    .select('exp_level_id')
    .first();

  return await knex.transaction(async function(t) {
    
    const users = await knex("users")
    .transacting(t)
    .insert([
      {
        email: "learner1@primaryorganization.com",
        name: "Jon",
        surname: "Snow",
        password: bcrypt.hashSync("test", 10),
        is_super_admin: 0
      },
      {
        email: "learner2@primaryorganization.com",
        name: "Aria",
        surname: "Stark",
        password: bcrypt.hashSync("test", 10),
        is_super_admin: 0
      },
      {
        email: "learner3@primaryorganization.com",
        name: "Eddard",
        surname: "Stark",
        password: bcrypt.hashSync("test", 10),
        is_super_admin: 0
      },
      {
        email: "learner4@primaryorganization.com",
        name: "Sansa",
        surname: "Stark",
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
            exp_level_id: firstLevel.exp_level_id
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
            role_id: 'Learner'
        });
    });

    await knex("employee_roles")
            .transacting(t)
            .insert(employeeRoles);

    let employeePrograms = [];
    employees.forEach(employeeId => {
      employeePrograms.push({
            employee_id: employeeId,
            program_id: program.program_id
        });
    });

    await knex("employee_programs")
    .transacting(t)
    .insert(employeePrograms);

    try {
        await t.commit();
    }
    catch(error) {
        console.log("Error while creating learners: ", error)
        await t.rollback();
    }


  });
};
