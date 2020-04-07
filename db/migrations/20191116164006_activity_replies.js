exports.up = function(knex) {
  return knex.schema.createTable('activity_replies', table => {
    table
    .uuid('activity_reply_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.bool('active').defaultTo(true); // Active
    table.text('text').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();

    table.foreign('activity_id').references('activity_id').inTable('activities');
    table.foreign('employee_id').references('employee_id').inTable('employees');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_replies');
};
