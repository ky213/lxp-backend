const bcrypt = require("bcrypt");
const knex = require("../db");
const Role = require("helpers/role");
const { checkIfEmailExists } = require("./user.service");

let defaultPassword = "admin";

module.exports = {
  add,
  addBulk,
  update,
  validateBulk
};

async function add(loggedInUser, userData, organizationId) {
  userData = {
    ...userData, 
    email: userData.email && userData.email.toLowerCase() || userData.email    
  };

  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  let validationOutput = await validateBulk(loggedInUser, [userData], organizationId);
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
        organization_id: organizationId,
        is_learner: true
      }));

      let employeeIds = await knex("employees")
        .transacting(t)
        .insert(_employees)
        .returning("employee_id");

      await knex("employee_roles")
        .transacting(t)
        .insert({
          employee_id: employeeIds[0],
          role_id: Role.Learner
        });      

      return {
        isValid: true
      };
    })
    .catch(err => console.log("err", err));
}

async function addBulk(loggedInUser, data, organizationId) {

  data = data.map(d => ({
    ...d,
    email: d.email && d.email.toLowerCase() || d.email    
  }));

  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

  let inserts = [];
  let output = [];
  let validationOutput = await validateBulk(loggedInUser, data, organizationId);

  if (validationOutput.hasErrors) {
    return {
      status: "error",
      errorDescription: validationOutput.data
        .filter(t => t.error)
        .map(t => t.error)
        .join(",")
    };
  }

  async function InsertLearnerAsync(t, userData) {
    return new Promise(async function(resolve, reject) {
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
        .then(() => {
          output.push({ ...userData, status: "ok" });
          return resolve();
        })
        .catch(err => {
          output.push({ ...userData, status: "error", error: err });
          return resolve();
        });        
    });
  }

  MapToArray = t => {
    data.forEach(user => {
      inserts.push(
        InsertLearnerAsync(t, user)
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

async function update(loggedInUser, user, organizationId) {
  user = {
    ...user,
    email: user.email && user.email.toLowerCase() || user.email    
  };

  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;
  
  let validationOutput = await validateBulk(loggedInUser, [user], organizationId);
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
        email: user.email.trim(),
      });

    await knex("employees")
      .transacting(t)
      .where("user_id", user.userId)
      .update({
        is_active: user.isActive,
      });

    return {
      isValid: true      
    };
  });  
}

async function validateBulk(loggedInUser, usersData, organizationId) {
  usersData = usersData.map(d => ({ 
    ...d,
    email: d.email && d.email.toLowerCase().trim() || d.email    
  }));

  organizationId = (loggedInUser.role == Role.SuperAdmin && organizationId) ? organizationId : loggedInUser.organization;

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

    output.data.push({ ...user, status: "ok" });
  }

  output.hasErrors = output.numOfRecordsInvalid > 0;

  return output;
}