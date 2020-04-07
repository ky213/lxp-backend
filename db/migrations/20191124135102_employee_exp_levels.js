
exports.up = function(knex) {
  return knex.schema.createTable('employee_exp_levels', table => {
    table
      .uuid('employee_exp_level_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('employee_id').notNullable();
    table.uuid('program_id').notNullable();
    table.uuid('academic_year_id').notNullable();
    table.uuid('exp_level_id').notNullable();
    
    table.foreign('employee_id').references('employee_id').inTable('employees');
    table.foreign('program_id').references('program_id').inTable('programs');
    table.foreign('academic_year_id').references('academic_year_id').inTable('academic_years');
    table.foreign('exp_level_id').references('exp_level_id').inTable('experience_levels');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('employee_exp_levels');
};
