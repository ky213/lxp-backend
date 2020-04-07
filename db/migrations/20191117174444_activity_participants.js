exports.up = function(knex) {
  return knex.schema.createTable('activity_participants', table => {
    table
      .uuid('activity_participant_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.uuid('employee_id').notNullable();

    table.foreign('activity_id').references('activity_id').inTable('activities');
    table.foreign('employee_id').references('employee_id').inTable('employees');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_participants');
};
