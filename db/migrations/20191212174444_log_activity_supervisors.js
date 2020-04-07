exports.up = function(knex) {
  return knex.schema.createTable('log_activity_supervisors', table => {
    table
      .uuid('log_activity_supervisor_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('log_activity_id').notNullable();
    table.uuid('employee_id').notNullable();

    table.foreign('log_activity_id').references('log_activity_id').inTable('log_activities');
    table.foreign('employee_id').references('employee_id').inTable('employees');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('log_activity_supervisors');
};
