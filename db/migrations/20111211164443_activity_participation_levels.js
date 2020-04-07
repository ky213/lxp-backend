exports.up = function(knex) {
  return knex.schema.createTable('activity_participation_levels', table => {
    table
    .integer('participation_level') 
    .notNullable()
    .primary();
    table.string('type', 50).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_participation_levels');
};
