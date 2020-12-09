exports.up = function(knex) {
  return knex.schema.alterTable('log_activities',  table => {
    table.boolean('is_public').notNullable().defaultTo(true);
  });
};

exports.down = function(knex) {
  return null;
};
