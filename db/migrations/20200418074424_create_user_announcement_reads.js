
exports.up = function(knex) {
  return knex.schema.createTable('user_announcement_reads', table => {
    table
      .uuid('user_announcement_read_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('user_id').notNullable();
    table.uuid('announcement_id').notNullable();
    
    table.foreign('user_id').references('user_id').inTable('users');
    table.foreign('announcement_id').references('announcement_id').inTable('announcements');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_announcement_reads');
};