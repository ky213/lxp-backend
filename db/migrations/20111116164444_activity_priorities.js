exports.up = function(knex) {
  return knex.schema.createTable('activity_priorities', table => {
    table
    .integer('priority_id') 
    .notNullable()
    .primary();
    table.string('name', 50).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_priorities');
};
