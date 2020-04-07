
exports.up = function(knex) {
  return knex.schema.createTable('experience_levels', table => {
    table
      .uuid('exp_level_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.string('name', 500).notNullable();
    table.integer('level').notNullable().defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('experience_levels');
};
