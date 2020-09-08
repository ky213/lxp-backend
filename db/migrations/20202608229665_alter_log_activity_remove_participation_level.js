exports.up = function(knex) {
  return knex.schema.table('log_activities',  table => {
    table.dropForeign('participation_level');
    table.dropColumn('participation_level');
  });
};

exports.down = function(knex) {
  return null;
};
