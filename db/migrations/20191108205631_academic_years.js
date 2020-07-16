exports.up = function(knex) {
  return knex.schema.createTable('academic_years', table => {
    table
    .uuid('academic_year_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('organization_id').notNullable();
    table.uuid('program_id').notNullable();
    table.string('name', 100).notNullable();
    table.timestamp('start_date');
    table.timestamp('end_date');    

    table.foreign('organization_id').references('organization_id').inTable('organizations');
    table.foreign('program_id').references('program_id').inTable('programs');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('academic_years');
};
