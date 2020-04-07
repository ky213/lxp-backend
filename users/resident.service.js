const bcrypt = require("bcrypt");
const knex = require("../db");
const Role = require("helpers/role");

const { checkIfEmailExists } = require("./user.service");
const { getProgramIdByProgramName } = require("programs/program.service");
const {
  getExpLevelIdByExpLevelName
} = require("experience_levels/experience_level.service");

let defaultPassword = "admin";

module.exports = {
  add,
  addBulk,
  update,
  validateBulk
};

async function add(loggedInUser, userData, instituteId) {
  userData = {
    ...userData, 
    email: userData.email && userData.email.toLowerCase() || userData.email    
  };

  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  let validationOutput = await validateBulk(loggedInUser, [userData], instituteId);
  if (validationOutput.hasErrors) {
    return {
      isValid: false,
      errorDetails: validationOutput.data.filter(t => t.error).map(t => t.error).join(',')
    };
  }

  return knex
    .transaction(async function(t) {
      let userIds = await knex("users")
        .transacting(t)
        .insert({
          name: userData.name.trim(),
          surname: userData.surname.trim(),
          email: userData.email.trim(),
          gender: userData.gender,
          start_date: userData.startDate,
          password: bcrypt.hashSync(defaultPassword, 10)
        })
        .returning("user_id");

      let _employees = userIds.map(userId => ({
        user_id: userId,
        institute_id: instituteId,
        exp_level_id: userData.expLevelId,
        is_resident: true
      }));

      let employeeIds = await knex("employees")
        .transacting(t)
        .insert(_employees)
        .returning("employee_id");

      await knex("employee_roles")
        .transacting(t)
        .insert({
          employee_id: employeeIds[0],
          role_id: Role.Resident
        });

      await knex("employee_programs")
        .transacting(t)
        .insert({
          employee_id: employeeIds[0],
          program_id: userData.programId
        });

      return {
        isValid: true
      };
    })
    .catch(err => console.log("err", err));
}

async function addBulk(loggedInUser, data, instituteId) {

  data = data.map(d => ({
    ...d,
    email: d.email && d.email.toLowerCase() || d.email    
  }));

  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  let inserts = [];
  let output = [];
  let validationOutput = await validateBulk(loggedInUser, data, instituteId);

  if (validationOutput.hasErrors) {
    return {
      status: "error",
      errorDescription: validationOutput.data
        .filter(t => t.error)
        .map(t => t.error)
        .join(",")
    };
  }

  async function InsertResidentAsync(t, userData) {
    return new Promise(async function(resolve, reject) {
      let program = await getProgramIdByProgramName(instituteId, userData.programName);

      if (!program) {
        output.push({
          ...userData,
          status: "error",
          error: "Program not found"
        });
        return resolve();
      }
      
      let expLevel = await getExpLevelIdByExpLevelName(
        program.programId,
        userData.expLevelName
      );
      if (!expLevel) {
        output.push({
          ...userData,
          status: "error",
          error: "Exp. level not found"
        });
        return resolve();
      }
      
      return t
        .into("users")
        .insert({
          name: userData.name.trim(),
          surname: userData.surname.trim(),          
          email: userData.email.trim(),
          gender: userData.gender,
          start_date: userData.startDate,
          password: bcrypt.hashSync(defaultPassword, 10)
        })
        .returning("user_id")
        .then(userIds => {
          let _employees = userIds.map(userId => ({
            user_id: userId,
            institute_id: instituteId,
            exp_level_id: expLevel.expLevelId,
            is_resident: true
          }));
          
          return t
            .into("employees")
            .insert(_employees)
            .returning("employee_id")
            .then(employeeIds => {
                let employeeRoles = employeeIds.map(employeeId => ({
                  employee_id: employeeId,
                  role_id: Role.Resident
                }));

                let employeePrograms = employeeIds.map(employeeId => ({
                  employee_id: employeeId,
                  program_id: program.programId
                }));
                
                
                return t.into("employee_roles").insert(employeeRoles).then(() => {
                  output.push({ ...userData, status: "ok" });
                  
                  return t
                  .into("employee_programs")
                  .insert(employeePrograms)
                  .then(() => {
                    output.push({ ...userData, status: "ok" });
                    return resolve();
                  })
                  .catch(err => {
                    output.push({ ...userData, status: "error", error: err });
                    return resolve();
                  });
                })
                .catch(err => {
                  output.push({ ...userData, status: "error", error: err });
                  return resolve();
                });              
            });
        });
    });
  }

  MapToArray = t => {
    data.forEach(user => {
      inserts.push(
        InsertResidentAsync(t, user)
      );
    });
  };

  return await knex
    .transaction(t => {
      MapToArray(t);

      Promise.all(inserts)
        .then(() => {
          return t.commit(output);
        })
        .catch(err => {
          return t.rollback(output);
        });
    })
    .catch(error => {
      t.rollback();
      return {
        isValid: false,
        errorDetails: error
      };
    });
}

async function update(loggedInUser, user, instituteId) {
  user = {
    ...user,
    email: user.email && user.email.toLowerCase() || user.email    
  };

  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;
  
  let validationOutput = await validateBulk(loggedInUser, [user], instituteId);
  if (validationOutput.hasErrors) {
    return {
      isValid: false,
      errorDetails: validationOutput.data.filter(t => t.error).map(t => t.error).join(',')
    };
  }

  return knex.transaction(async function(t) {
    await knex("users")
      .transacting(t)
      .where("user_id", user.userId)
      .update({
        name: user.name.trim(),
        surname: user.surname.trim(),      
        gender: user.gender,
        start_date: user.startDate,  
        email: user.email.trim()
      });
    await knex("employees")
      .transacting(t)
      .where("employee_id", user.employeeId)
      .update({
        exp_level_id: user.expLevelId,
        is_active: user.isActive
      });
    await knex("employee_programs")
      .transacting(t)
      .where("employee_id", user.employeeId)
      .update({
        program_id: user.programId
      });

    return {
      isValid: true      
    };
  });  
}

async function validateBulk(loggedInUser, usersData, instituteId) {
  usersData = usersData.map(d => ({ 
    ...d,
    email: d.email && d.email.toLowerCase().trim() || d.email    
  }));

  instituteId = (loggedInUser.role == Role.SuperAdmin && instituteId) ? instituteId : loggedInUser.institute;

  let output = {
    hasErrors: false,
    numOfRecordsInvalid: 0,
    data: []
  };

  let emails = [];
  
  function addError(userData, error) {
    output.data.push({ ...userData, status: "error", error });
    output.numOfRecordsInvalid = output.numOfRecordsInvalid + 1;
  }

  for (let i = 0; i < usersData.length; i++) {
    let user = usersData[i];

    if (!user.name || !user.name.trim()) {
      addError(user, "Name is empty");
      continue;
    }

    if (!user.gender) {
      addError(user, "Gender is empty");
      continue;
    }

    if (!user.startDate) {
      addError(user, "Start date is not defined");
      continue;
    }

    if (user.gender != 'M' && user.gender != 'F') {
      addError(user, "Gender is not valid");
      continue;
    }

    if (!user.surname || !user.surname.trim()) {
      addError(user, "Surname is empty");
      continue;
    }

    if (!user.email) {
      addError(user, "Email is empty");
      continue;
    }

    if (emails.indexOf(user.email) >= 0) {
      addError(user, "The same email already defined in the file");
      continue;
    }
    emails.push(user.email);

    let emailExists = await checkIfEmailExists(user.email, user.userId);
    if (emailExists) {
      addError(user, "Email already exists");
      continue;
    }

    if (!user.programName && !user.programId) {
      addError(user, "Program is not defined");
      continue;
    }

    if (!user.expLevelName && !user.expLevelId) {
      addError(user, "Exp. level is not defined");
      continue;
    }

    let program = null;
    if (!user.programId) {
      program = await getProgramIdByProgramName(instituteId, user.programName.trim());
      if (!program) {
        addError(user, "Program not found");
        continue;
      }
    }

    if (!user.expLevelId) {
      let expLevel = await getExpLevelIdByExpLevelName(
        program.programId,
        user.expLevelName.trim()
      );
      if (!expLevel) {
        addError(user, "Exp. level not found");
        continue;
      }
    }

    output.data.push({ ...user, status: "ok" });
  }

  output.hasErrors = output.numOfRecordsInvalid > 0;

  return output;
}
