exports.up = function(knex) {
  return knex.schema.createTable('notification_channels', table => {
    table
    .uuid('notification_channel_id').defaultTo(knex.raw('uuid_generate_v4()'))  
    .primary();
    table.uuid('notification_id').notNullable();
    table.integer('notification_channel_type_id').notNullable();

    table.foreign('notification_id').references('notification_id').inTable('notifications');
    table.foreign('notification_channel_type_id').references('notification_channel_type_id').inTable('notification_channel_types');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notification_channels');
};
