
exports.up = function(knex) {
  return knex.schema.createTable('activities_files', table => {
    table
      .uuid('activity_file_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.binary('file').notNullable();
    table.string('name', 500).notNullable();
    table.string('type', 50).notNullable();
    table.string('extension', 50).notNullable();
    table.integer('size', 50).notNullable();

    table.foreign('activity_id').references('activity_id').inTable('activities');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activities_files');
};
