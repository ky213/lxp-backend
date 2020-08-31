exports.up = function(knex) {
  return knex.schema.createTable('groups', table => {
    table
    .uuid('group_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.string('name', 80).notNullable();
    table.uuid('group_type_id').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);    
    table.uuid('organization_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();

    table.foreign('organization_id').references('organization_id').inTable('organizations');
    table.foreign('group_type_id').references('group_type_id').inTable('group_types').onDelete("RESTRICT");

    table.unique(['name', 'organization_id']);
    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('groups');
};
