exports.up = function(knex) {
  return knex.schema.alterTable('user_courses',  table => {
    table.boolean('is_completed').notNullable().defaultTo(false);
  });
};

exports.down = function(knex) {
  return null;
};
