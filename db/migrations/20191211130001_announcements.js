
exports.up = function(knex) {
  return knex.schema.createTable('announcements', table => {
    table
      .uuid('announcement_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.string('title', 200).notNullable();
    table.string('text', 2000).notNullable();
    table.date('date_from');
    table.date('date_to');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('institute_id').notNullable();
    
    table.foreign('institute_id').references('institute_id').inTable('institutes');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('announcements');
};
