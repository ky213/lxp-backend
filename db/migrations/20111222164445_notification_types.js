exports.up = function(knex) {
  return knex.schema.createTable('notification_types', table => {
    table.integer('notification_type_id').primary();
    table.string('name', 50).notNullable();
    table.string('type', 20).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notification_types');
};
