exports.up = function(knex) {
  return knex.schema.alterTable('courses', table => {
    table.foreign('program_id').references('program_id').inTable('programs');
  });
};

exports.down = function(knex) {
  return null;
};
