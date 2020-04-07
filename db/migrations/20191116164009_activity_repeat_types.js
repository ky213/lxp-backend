exports.up = function(knex) {
  return knex.schema.createTable('activity_repeat_types', table => {
    table
    .uuid('activity_repeat_type_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.string('type', 50).notNullable();
    table.timestamp('from');
    table.timestamp('to');

    table.foreign('activity_id').references('activity_id').inTable('activities');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_repeat_types');
};
