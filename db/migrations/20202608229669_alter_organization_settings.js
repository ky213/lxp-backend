exports.up = function(knex) {
  return knex.schema.alterTable('organization_settings',  table => {
    table.unique('organization_id');
  });
};

exports.down = function(knex) {
  return null;
};
