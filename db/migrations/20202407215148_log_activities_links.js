
exports.up = function(knex) {
  return knex.schema.createTable('log_activities_links', table => {
    table
      .uuid('log_activity_link_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('log_activity_id').notNullable();
    table.text('url').notNullable();

    table.foreign('log_activity_id').references('log_activity_id').inTable('log_activities');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('log_activities_links');
};
