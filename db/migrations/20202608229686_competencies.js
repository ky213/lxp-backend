exports.up = function(knex) {
  return knex.schema.createTable('competencies', table => {
    table
      .uuid('competency_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('competency_type_id').notNullable();
    table.string('code', 80).notNullable();
    table.string('title', 80).notNullable();
    table.string('description', 250).notNullable();    
    table.integer('time_expected').notNullable();
    table.uuid('organization_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();

    table.foreign('competency_type_id').references('competency_type_id').inTable('competency_type');
    table.foreign('organization_id').references('organization_id').inTable('organizations');   
     
    table.unique(['code', 'organization_id']);
  
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('competencies');
};
