exports.up = function(knex) {
  return knex.schema.createTable('lessons', table => {
    table
      .uuid('lesson_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('course_id').notNullable();
    table.uuid('organization_id').notNullable();
    table.string('name', 150).notNullable();
    table.text('content_path').notNullable();
    table.integer('order');

    table.foreign('course_id').references('course_id').inTable('courses');
    table.foreign('organization_id').references('organization_id').inTable('organizations');

  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('lessons');
};
