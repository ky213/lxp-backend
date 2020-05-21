exports.up = function(knex) {
  return knex.schema.createTable('activity_courses', table => {
    table
      .uuid('activity_courses_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('activity_id').notNullable();
    table.uuid('course_id').notNullable();

    table.foreign('activity_id').references('activity_id').inTable('activities');
    table.foreign('course_id').references('course_id').inTable('courses');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_courses');
};
