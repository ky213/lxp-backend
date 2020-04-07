exports.up = function(knex) {
  return knex.schema.createTable('activity_types', table => {
    table
    .integer('activity_type_id')
    .notNullable();    
    table.uuid('institute_id');      
    table.string('name', 50).notNullable();

    table.primary(['activity_type_id', 'institute_id']);

    table.foreign('institute_id').references('institute_id').inTable('institutes');    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_types');
};
