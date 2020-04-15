exports.up = function(knex) {
    return knex.schema.createTable('courses', table => {
      table
        .uuid('course_id').defaultTo(knex.raw('uuid_generate_v4()'))  
        .primary();
      table.uuid('institute_id').notNullable();
      table.uuid('program_id').notNullable();
      table.string('name', 150).notNullable();
      table.string('description', 500);
      table.text('content_path').notNullable();
      table.text('image');
      table.integer('period_days');
      table.timestamp('starting_date');

      table.timestamp('generated').notNullable().defaultTo(knex.fn.now());
      table.uuid('generated_by_user');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('courses');
  };
  