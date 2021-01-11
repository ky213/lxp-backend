exports.up = function(knex) {
  return knex.schema.alterTable('log_activities_files', table => {
    table.text('file').alter();
  });
};

exports.down = function(knex) {
  return null;
};
