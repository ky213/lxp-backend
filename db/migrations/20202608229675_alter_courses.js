exports.up = function(knex) {
  return knex.schema.alterTable('courses',  table => {
    table.integer('activity_number');
  });
};

exports.down = function(knex) {
  return null;
};
