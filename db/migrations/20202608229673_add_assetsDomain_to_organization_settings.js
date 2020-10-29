exports.up = function(knex) {
  return knex.schema.alterTable('organization_settings',  table => {
    table.string('assetsDomain').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('organization_settings',  table => {
    table.dropColumn('assetsDomain');
  });
};
