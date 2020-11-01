exports.up = function(knex) {
  return knex.schema.alterTable('courses',  table => {
    table.string('course_code');
    table.unique(['course_code', 'organization_id']);
  });
};

exports.down = function(knex) {
  return null;
};
