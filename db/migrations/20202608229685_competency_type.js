exports.up = function(knex) {
  return knex.schema.createTable('competency_type', table => {
    table
      .uuid('competency_type_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
      table.string('name', 80).notNullable();
      table.string('level', 80).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('created_by').notNullable();
      table.timestamp('modified_at').defaultTo(knex.fn.now());
      table.string('modified_by').notNullable();

      table.uuid('organization_id').notNullable();
 
      table.foreign('organization_id').references('organization_id').inTable('organizations');    
      table.unique(['name', 'organization_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('competency_type');
};
