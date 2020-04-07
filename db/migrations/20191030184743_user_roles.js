
exports.up = function(knex) {
  return knex.schema.createTable('employee_roles', table => {
    table
      .increments('employee_role_id') 
      .unsigned()
      .notNullable()
      .primary();
    table.uuid('employee_id').notNullable();
    table.string('role_id', 30).notNullable();
    
    table.foreign('employee_id').references('employee_id').inTable('employees');
    table.foreign('role_id').references('role_id').inTable('roles');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('employee_roles');
};
