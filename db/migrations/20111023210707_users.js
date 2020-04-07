
exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table
      .uuid('user_id').defaultTo(knex.raw('uuid_generate_v4()')) 
      .primary();
    table.string('email', 255).notNullable().unique();
    table.string('name', 60).notNullable();
    table.string('surname', 120).notNullable();
    table.string('gender', 1);
    table.binary('profile_photo');
    table.string('phone_number', 50);
    table.string('pager_number', 50);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.date('start_date');
    table.string('password', 76).notNullable();
    table.integer('is_super_admin').notNullable().defaultTo(0);    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
