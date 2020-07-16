exports.up = function(knex) {
  return knex.schema.createTable('activity_types', table => {
    table
    .integer('activity_type_id')
    .notNullable();    
    table.uuid('organization_id');      
    table.string('name', 50).notNullable();

    table.primary(['activity_type_id', 'organization_id']);

    table.foreign('organization_id').references('organization_id').inTable('organizations');    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_types');
};
