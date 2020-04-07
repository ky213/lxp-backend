exports.up = function(knex) {
  return knex.schema.createTable('activity_levels', table => {
    table
      .uuid('activity_levels_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.uuid('exp_level_id').notNullable();

    table.foreign('activity_id').references('activity_id').inTable('activities');
    table.foreign('exp_level_id').references('exp_level_id').inTable('experience_levels');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_levels');
};
