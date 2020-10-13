exports.up = function(knex) {
  return knex.schema.alterTable('organizations',  table => {
    table.string('domain', 60).nullable();
  });
};

exports.down = function(knex) {
  return null;
};
