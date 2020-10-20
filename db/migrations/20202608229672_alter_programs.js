exports.up = function(knex) {
  return knex.schema.alterTable('programs',  table => {
    table.string('certifcate_subject');
    table.text('certifcate_body');
  });
};

exports.down = function(knex) {
  return null;
};
