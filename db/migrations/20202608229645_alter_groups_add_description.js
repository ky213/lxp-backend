exports.up = function(knex) {
  return knex.schema.alterTable('groups', table => {
    table.string('description', 60).nullable();    
  });
};

exports.down = function(knex) {
  return null;
};
