
exports.up = function(knex) {
    return knex.schema.createTable('program_block_types', table => {
        table
        .increments('block_type_id') 
        .unsigned()
        .notNullable()
        .primary();
        table.string('description', 60).notNullable();    
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('program_block_types');
  };
  