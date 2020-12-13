exports.up = function(knex) {
  return knex.schema.alterTable('programs',  table => {
    table.boolean('is_default');
  });
};

exports.down = function(knex) {
  return null;
};
