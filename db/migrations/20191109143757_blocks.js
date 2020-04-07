exports.up = function(knex) {
  return knex.schema.createTable('blocks', table => {
    table
      .uuid('block_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('academic_year_id').notNullable();
    table.string('name', 100).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();

    table.foreign('academic_year_id').references('academic_year_id').inTable('academic_years');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('blocks');
};
