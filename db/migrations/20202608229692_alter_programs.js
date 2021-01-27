exports.up = function(knex) {
  return knex.schema.alterTable('programs',  table => {
    table.text('thumbnail');
  });
};

exports.down = function(knex) {
  return null;
};
