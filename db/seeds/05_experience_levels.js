
exports.seed = async function(knex) {
    return await knex.transaction(async function(t) {
        const organization = await knex('organizations')
        .where('name', 'Primary organization')
        .select('organization_id')
        .first();

        /*
        const program = await knex('programs')
        .where('name', 'Internal Medicine')
        .andWhere('organization_id', organization.organization_id)
        .select('program_id')
        .first();
        */

        const insertLevels = [
            {
                level: 1,
                name: "R1"
            },
            {
                level: 2,
                name: "R2"
            },          
            {
                level: 3,
                name: "R3"
            },
            {
                level: 4,
                name: "R4"
            }
        ];

        await knex('experience_levels')
        .transacting(t)
        .insert(insertLevels);

        try {
            await t.commit();
        }
        catch(exc) {
            await t.rollback();
        }

    }); 
};