
exports.up = function(knex) {
  return knex.schema.createTable('roles', table => {
    table.string('role_id', 30).notNullable().primary();
    table.string('name', 60).notNullable();    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('roles');
};
