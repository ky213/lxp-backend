exports.up = function(knex) {
    return knex.schema.createTable('statements', table => {
      table
        .uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))  
        .primary();
      table.string('statement_id', 100).notNullable();
      table.json('payload').notNullable();
      table.timestamp('generated').notNullable().defaultTo(knex.fn.now());
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('statements');
  };
  