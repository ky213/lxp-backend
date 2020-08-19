exports.up = function(knex) {
  return knex.schema.createTable('group_types', table => {
    table
      .uuid('group_type_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.string('name', 50).notNullable().unique();
    table.uuid('organization_id').notNullable();
 
    table.foreign('organization_id').references('organization_id').inTable('organizations');
    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('group_types');
};
