
exports.up = function(knex) {
  return knex.schema.createTable('announcement_files', table => {
    table
      .uuid('announcement_file_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('announcement_id').notNullable();
    table.binary('file').notNullable();
    table.string('name', 500).notNullable();
    table.string('type', 50).notNullable();
    table.string('extension', 50).notNullable();
    table.integer('size', 50).notNullable();

    table.foreign('announcement_id').references('announcement_id').inTable('announcements');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('announcement_files');
};
