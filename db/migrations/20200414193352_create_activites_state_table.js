exports.up = function(knex) {
    return knex.schema.createTable('activities_state', table => {
      table
        .uuid('activity_state_id').defaultTo(knex.raw('uuid_generate_v4()'))  
        .primary();
      table.string('state_id', 100).notNullable();
      table.string('activity_id', 255).notNullable();
      table.json('agent').notNullable();
      table.json('state').notNullable();
      table.uuid('registration');
      table.timestamp('generated').notNullable().defaultTo(knex.fn.now());
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('activities_state');
  };
  