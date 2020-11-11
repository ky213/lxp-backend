exports.up = function(knex) {
  return knex.schema.alterTable('user_courses',  table => {
    table.integer('activity_numbers_completed');
  });
};

exports.down = function(knex) {
  return null;
};
