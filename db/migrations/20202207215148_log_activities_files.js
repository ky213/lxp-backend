
exports.up = function(knex) {
  return knex.schema.createTable('log_activities_files', table => {
    table
      .uuid('log_activity_file_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('log_activity_id').notNullable();
    table.binary('file').notNullable();
    table.string('name', 500).notNullable();
    table.string('type', 50).notNullable();
    table.string('extension', 50).notNullable();
    table.integer('size', 50).notNullable();

    table.foreign('log_activity_id').references('log_activity_id').inTable('log_activities');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('log_activities_files');
};
