
exports.up = function(knex) {
    return knex.schema.createTable('programs', table => {
        table
          .uuid('program_id').defaultTo(knex.raw('uuid_generate_v4()')) 
          .primary();
        table.string('name', 80).notNullable();
        table.uuid('organization_id').notNullable();
        table.boolean('is_active').defaultTo(true);
        table.string('description', 300);
        table.string('duty_time_from');
        table.string('duty_time_to');
        table.integer('allowed_annual_vacation_weeks').defaultTo(4);
        table.integer('allowed_educational_leave_days').defaultTo(7);
        table.integer('allowed_emergency_leave_days').defaultTo(5);
        table.integer('total_block_junior').defaultTo(26);
        table.integer('total_block_senior').defaultTo(26);
        table.integer('block_type_id').notNullable();
        table.integer('min_experience_level').notNullable().defaultTo(1);
        table.integer('max_experience_level').notNullable().defaultTo(4);
        table.integer('senior_learners_start_level').notNullable().defaultTo(3);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.string('created_by').notNullable();
        table.timestamp('modified_at').defaultTo(knex.fn.now());
        table.string('modified_by').notNullable();

        table.foreign('organization_id').references('organization_id').inTable('organizations');
        table.foreign('block_type_id').references('block_type_id').inTable('program_block_types');

        table.unique(['name', 'organization_id']);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('programs');
}
