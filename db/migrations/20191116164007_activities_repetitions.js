exports.up = function(knex) {
  return knex.schema.createTable('activities_repetitions', table => {
    table
      .uuid('activity_repetition_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.text('rrule').notNullable();
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();
    
    table.foreign('activity_id').references('activity_id').inTable('activities');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activities_repetitions');
};
