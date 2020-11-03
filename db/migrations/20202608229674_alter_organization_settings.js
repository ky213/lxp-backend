exports.up = function(knex) {
  return knex.schema.alterTable('organization_settings',  table => {
    table.string('update_subject');
    table.text('update_body');
  });
};

exports.down = function(knex) {
  return null;
};
