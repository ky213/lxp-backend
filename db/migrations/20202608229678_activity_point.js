exports.up = function(knex) {
  return knex.schema.createTable('activity_points', table => {
    table
      .uuid('activity_point_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_reply_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.integer('points').notNullable();
    table.timestamp('starting_date').notNullable().defaultTo(knex.fn.now());

    table.foreign('activity_reply_id').references('activity_reply_id').inTable('activity_replies');
    table.foreign('employee_id').references('employee_id').inTable('employees');
  
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_points');
};
