exports.up = function(knex) {
  return knex.schema.createTable('groups_employee', table => {
    table
    .uuid('groups_employee_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('group_id').notNullable();
    table.uuid('employee_id').notNullable();

    table.foreign('group_id').references('group_id').inTable('groups');
    table.foreign('employee_id').references('employee_id').inTable('employees');

    table.unique(['group_id', 'employee_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('groups_employee');
};
