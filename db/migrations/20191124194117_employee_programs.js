
exports.up = function(knex) {
  return knex.schema.createTable('employee_programs', table => {
    table
      .uuid('employee_program_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('employee_id').notNullable();
    table.uuid('program_id').notNullable();    
    
    table.foreign('employee_id').references('employee_id').inTable('employees');
    table.foreign('program_id').references('program_id').inTable('programs');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('employee_programs');
};
