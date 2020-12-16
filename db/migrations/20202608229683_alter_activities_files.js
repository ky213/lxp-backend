exports.up = function(knex) {
  return knex.schema.alterTable('activities_files', table => {
    table.uuid('activity_reply_id').nullable();
    table.foreign('activity_reply_id').references('activity_reply_id').inTable('activity_replies').onDelete("RESTRICT");
  });
};

exports.down = function(knex) {
  return null;
};
