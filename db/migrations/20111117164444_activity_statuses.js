exports.up = function(knex) {
  return knex.schema.createTable('activity_statuses', table => {
    table
    .integer('activity_status_id') 
      .primary();
    table.string('name', 50).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_statuses');
};
