exports.up = function(knex) {
    return knex.schema.alterTable('activities_state', table => {
      table.text('registration').alter();
      table.uuid('course_id').nullable();
      table.integer('view_count').defaultTo(0);
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.alterTable('activities_state', table => {
      table.uuid('registration').alter();
      table.dropColumn('course_id');
      table.dropColumn('view_count');
    });
  };
  