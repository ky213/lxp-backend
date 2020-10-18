exports.up = function(knex) {
  return knex.schema.alterTable('users',  table => {
    table.string('reset_password_token').nullable();
    table.timestamp('reset_password_expires').nullable();
  });
};

exports.down = function(knex) {
  return null;
};
