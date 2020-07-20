
exports.up = function(knex) {
  return knex.schema.createTable('employees', table => {
    table
      .uuid('employee_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('user_id').notNullable();
    table.uuid('organization_id').notNullable();
    table.boolean('is_learner').notNull().defaultTo(true);
    table.binary('profile_photo');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('exp_level_id');    
    
    table.foreign('user_id').references('user_id').inTable('users');
    table.foreign('organization_id').references('organization_id').inTable('organizations');
    table.foreign('exp_level_id').references('exp_level_id').inTable('experience_levels');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('employees');
};
