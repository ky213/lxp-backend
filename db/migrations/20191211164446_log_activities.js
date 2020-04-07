exports.up = function(knex) {
  return knex.schema.createTable('log_activities', table => {
    table
      .uuid('log_activity_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('program_id').notNullable();
    table.string('name', 150).notNullable();
    table.integer('activity_type_id').notNullable();
    table.integer('participation_level').notNullable();
    table.uuid('logged_by').notNullable();
    table.timestamp('start').notNullable();
    table.timestamp('end').notNullable();
    table.integer('status').notNullable().defaultTo(2); // Active
    table.text('details');
    table.string('location', 150);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();
    
    table.foreign('status').references('activity_status_id').inTable('activity_statuses');
    table.foreign('logged_by').references('employee_id').inTable('employees');
    table.foreign('participation_level').references('participation_level').inTable('activity_participation_levels');
    table.foreign('program_id').references('program_id').inTable('programs');
    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('log_activities');
};
