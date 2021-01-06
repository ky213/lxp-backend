exports.up = function(knex) {
  return knex.schema.alterTable('activities_files', table => {
    table.text('file').alter();
  });
};

exports.down = function(knex) {
  return null;
};
