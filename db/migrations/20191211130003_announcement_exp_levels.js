
exports.up = function(knex) {
  return knex.schema.createTable('announcement_exp_levels', table => {
    table
      .uuid('announcement_exp_level_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('announcement_id').notNullable();
    table.uuid('exp_level_id').notNullable();

    table.foreign('announcement_id').references('announcement_id').inTable('announcements');
    table.foreign('exp_level_id').references('exp_level_id').inTable('experience_levels');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('announcement_exp_levels');
};
