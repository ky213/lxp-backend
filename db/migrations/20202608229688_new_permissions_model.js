
exports.up = async function (knex) {
    await knex.schema
        .alterTable('roles', table => {
            table.specificType('permissions', 'text ARRAY').nullable();
            table.boolean('global').defaultTo(false);
            table.uuid('organization_id');
            table.foreign('organization_id').references('organization_id').inTable('organizations');
        })

    await knex.schema
        .createTable('permissions', table => {
            table.specificType('permissions', 'text ARRAY').nullable();
            table.boolean('global').defaultTo(false);
            table.uuid('organization_id');
            table.foreign('organization_id').references('organization_id').inTable('organizations');
        })

};

exports.down = function (knex) {
    return knex.schema.alterTable('roles', table => {
        table.dropColumn('permissions');
        table.dropColumn('global');
        table.dropColumn('organization_id');
    });
};
