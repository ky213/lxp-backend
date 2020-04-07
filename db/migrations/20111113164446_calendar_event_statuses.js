exports.up = function(knex) {
  return knex.schema.createTable('calendar_event_statuses', table => {
    table
    .increments('calendar_event_status_id') 
    .unsigned()
    .notNullable()
    .primary();
    table.string('status', 30).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('calendar_event_statuses');
};
