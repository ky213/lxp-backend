exports.up = function(knex) {
  return knex.schema.createTable('user_courses', table => {
    table
      .uuid('user_courses_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('user_id').notNullable();
    table.uuid('course_id').notNullable();
    table.boolean('is_able_to_join').notNullable().defaultTo(true);
    table.timestamp('joining_date');
    
    table.foreign('user_id').references('user_id').inTable('users');
    table.foreign('course_id').references('course_id').inTable('courses');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_courses');
};
