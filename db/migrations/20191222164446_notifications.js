exports.up = function(knex) {
  return knex.schema.createTable('notifications', table => {
    table
      .uuid('notification_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.integer('notification_type_id').notNullable().defaultTo(1);
    table.uuid('user_id');
    table.timestamp('generated').notNullable().defaultTo(knex.fn.now());
    table.text('text').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.text('reference');
    
    table.foreign('user_id').references('user_id').inTable('users');
    table.foreign('notification_type_id').references('notification_type_id').inTable('notification_types');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
};
