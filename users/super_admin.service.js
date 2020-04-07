const knex = require('../db');
const bcrypt = require("bcrypt");
const { checkIfEmailExists } = require("./user.service");

module.exports = {
    getAll,
    getByUserId,
    add,
    update
};

let defaultPassword = "admin";

async function getAll(loggedInUser) {
  var users = await knex('users')
      .where('is_super_admin', 1)
      .orderBy('users.is_active', 'desc')
      .orderBy('surname', 'asc')
      .orderBy('name', 'asc')
      .select([
          'users.user_id as userId',
          'users.email', 
          'users.name',
          'users.surname',
          'users.profile_photo as profilePhoto',       
          'users.is_active as isActive'
      ]);
      
  return users;
}

async function getByUserId(loggedInUser, userId) {
  var user = await knex('users')
      .where('is_super_admin', 1)
      .andWhere('user_id', userId)
      .select([
          'users.user_id as userId',
          'users.email', 
          'users.name',
          'users.surname',          
          'users.profile_photo as profilePhoto',       
          'users.is_active as isActive'
      ])
      .first();
      
  return user;
}

async function add(loggedInUser, name, surname, email) {
  email = email && email.trim().toLowerCase() || email;
  name = name && name.trim() || name;
  surname = surname && surname.trim() || surname;

  await validate(null, name, surname, email);

  return knex('users')
    .insert({
      name,
      surname,
      email,
      is_active: true,
      is_super_admin: 1,
      password: bcrypt.hashSync(defaultPassword, 10)
    });
}

async function update(loggedInUser, userId, name, surname, email, isActive) {
  email = email && email.trim().toLowerCase() || email;
  name = name && name.trim() || name;
  surname = surname && surname.trim() || surname;

  await validate(userId, name, surname, email);

  return knex('users')
    .where('user_id', userId)
    .update({
      name: name,
      surname: surname,
      email: email,
      is_active: isActive
    });
}

async function validate(userId, name, surname, email) {
  if (!name) {
    throw new Error("Name is empty");
  }

  if (!surname) {
    throw new Error("Surname is empty");
  }

  if (!email) {
    throw new Error("Email is empty");
  }

  let emailExists = await checkIfEmailExists(email, userId);
  if (emailExists) {
    throw new Error("Email already exists");
  }
}