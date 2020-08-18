exports.up = function(knex) {
  return knex.schema.alterTable('organizations', table => {
    table.uuid('default_group_id').nullable();
    table.foreign('default_group_id').references('group_id').inTable('groups');
  });
};

exports.down = function(knex) {
  return null;
};
