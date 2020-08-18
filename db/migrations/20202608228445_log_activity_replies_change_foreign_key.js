exports.up = function(knex) {
  return knex.schema.alterTable('log_activity_replies', table => {
    table.dropForeign('activity_id');

      table
      .foreign("activity_id")
      .references("log_activities.log_activity_id")
      .onDelete("CASCADE");
  });
};

exports.down = function(knex) {
  return null;
};
