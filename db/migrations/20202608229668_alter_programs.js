exports.up = function(knex) {
  return knex.schema.alterTable('programs',  table => {
    table.string('subject');
    table.text('body');
  });
};

exports.down = function(knex) {
  return null;
};
