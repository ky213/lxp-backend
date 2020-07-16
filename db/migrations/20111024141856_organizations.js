
exports.up = function(knex) {
    return knex.schema.createTable('organizations', table => {
        table
          .uuid('organization_id').defaultTo(knex.raw('uuid_generate_v4()')) 
          .primary();
        table.string('name', 80).notNullable().unique();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.text('logo');
        table.string('color_code', 7);
        table.string('background_color_code');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('created_by').notNullable();
        table.timestamp('modified_at').defaultTo(knex.fn.now());
        table.string('modified_by').notNullable();
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('organizations');
}
