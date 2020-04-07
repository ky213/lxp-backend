
exports.up = function(knex) {
  return knex.schema.createTable('employees', table => {
    table
      .uuid('employee_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('user_id').notNullable();
    table.uuid('institute_id').notNullable();
    table.boolean('is_resident').notNull().defaultTo(true);
    table.binary('profile_photo');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('exp_level_id');    
    
    table.foreign('user_id').references('user_id').inTable('users');
    table.foreign('institute_id').references('institute_id').inTable('institutes');
    table.foreign('exp_level_id').references('exp_level_id').inTable('experience_levels');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('employees');
};
