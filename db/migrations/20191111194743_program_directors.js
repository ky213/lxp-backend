
exports.up = function(knex) {
    return knex.schema.createTable('program_directors', table => {
        table
          .uuid('program_director_id').defaultTo(knex.raw('uuid_generate_v4()')) 
          .primary();
        table.uuid('program_id').notNullable();
        table.uuid('employee_id').notNullable();
        
        table.foreign('program_id').references('program_id').inTable('programs');
        table.foreign('employee_id').references('employee_id').inTable('employees');
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('program_directors');
}
