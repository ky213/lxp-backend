exports.up = function(knex) {
  return knex.schema.createTable('organization_settings', table => {
    table
    .uuid('settings_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();   
    table.uuid('organization_id');
    table.string('smtp_host');
    table.integer('port_number');
    table.string('encryption');
    table.string('email');
    table.string('label');
    table.string('server_id');
    table.string('password');
    table.string('subject');
    table.text('body');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('created_by').notNullable();
    table.timestamp('modified_at').defaultTo(knex.fn.now());
    table.string('modified_by').notNullable();
    
    table.foreign('organization_id').references('organization_id').inTable('organizations');
    
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('organization_settings');
};
