exports.up = function(knex) {
  return knex.schema.createTable('calendar_events', table => {
    table
      .uuid('calendar_event_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('employee_id').notNullable();
    table.string('title', 150).notNullable();
    table.timestamp('start').notNullable();
    table.timestamp('end').notNullable();
    table.bool('allDay').default(false);
    table.integer('status_id').notNullable();
    table.string('description', 500);
    table.uuid('references_employee_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();
    
    table.foreign('employee_id').references('employee_id').inTable('employees');
    table.foreign('references_employee_id').references('employee_id').inTable('employees');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('calendar_events');
};
