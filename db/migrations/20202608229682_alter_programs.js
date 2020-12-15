exports.up = function(knex) {
  return knex.schema.alterTable('programs',  table => {
    table.boolean('is_default').notNullable().defaultTo(true);
  });
};

exports.down = function(knex) {
  return null;
};
