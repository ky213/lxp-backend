
exports.up = function(knex) {
  return knex.schema.createTable('activities_links', table => {
    table
      .uuid('activity_link_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.text('url').notNullable();

    table.foreign('activity_id').references('activity_id').inTable('activities');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activities_links');
};
