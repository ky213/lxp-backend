
exports.up = function(knex) {
  return knex.schema.createTable('employee_announcement_reads', table => {
    table
      .uuid('employee_announcement_read_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('employee_id').notNullable();
    table.uuid('announcement_id').notNullable();
    
    table.foreign('employee_id').references('employee_id').inTable('employees');
    table.foreign('announcement_id').references('announcement_id').inTable('announcements');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('employee_announcement_reads');
};
