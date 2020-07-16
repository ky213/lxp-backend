exports.up = function(knex) {
  return knex.schema.createTable('activities', table => {
    table
      .uuid('activity_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('organization_id').notNullable();
    table.uuid('program_id');
    table.uuid('exp_level_id');
    table.string('name', 150).notNullable();
    table.integer('activity_type_id').notNullable();
    table.integer('priority').notNullable();
    table.uuid('assigned_by').notNullable();
    table.timestamp('start').notNullable();
    table.timestamp('end').notNullable();
    table.integer('status').notNullable();
    table.string('description', 600);
    table.string('location', 150);
    table.bool('repeat').default(false);
    table.integer('during');
        
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();
    
    table.foreign('priority').references('priority_id').inTable('activity_priorities');
    table.foreign('organization_id').references('organization_id').inTable('organizations');
    table.foreign('program_id').references('program_id').inTable('programs');
    table.foreign('exp_level_id').references('exp_level_id').inTable('experience_levels');    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activities');
};
