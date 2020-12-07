exports.up = function(knex) {
  return knex.schema.alterTable('activities',  table => {
    table.integer('total_points');
  });
};

exports.down = function(knex) {
  return null;
};
