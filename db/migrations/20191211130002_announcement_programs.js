
exports.up = function(knex) {
  return knex.schema.createTable('announcement_programs', table => {
    table
      .uuid('announcement_program_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('announcement_id').notNullable();
    table.uuid('program_id').notNullable();

    table.foreign('announcement_id').references('announcement_id').inTable('announcements');
    table.foreign('program_id').references('program_id').inTable('programs');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('announcement_programs');
};
