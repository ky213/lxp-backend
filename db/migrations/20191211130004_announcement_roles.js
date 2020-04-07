
exports.up = function(knex) {
  return knex.schema.createTable('announcement_roles', table => {
    table
      .uuid('announcement_role_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('announcement_id').notNullable();
    table.string('role_id').notNullable();

    table.foreign('announcement_id').references('announcement_id').inTable('announcements');
    table.foreign('role_id').references('role_id').inTable('roles');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('announcement_roles');
};
