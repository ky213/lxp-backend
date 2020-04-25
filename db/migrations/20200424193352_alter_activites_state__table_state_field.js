exports.up = function(knex) {
    return knex.schema.alterTable('activities_state', table => {
      table.text('state').alter();
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.alterTable('activities_state', table => {
      table.json('state').notNullable().alter();
    });
  };
  