exports.up = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.uuid('group_id').nullable();
    table.foreign('group_id').references('group_id').inTable('groups');
  });
};

exports.down = function(knex) {
  return null;
};
