
exports.seed = async function(knex) {
    return await knex.transaction(async function(t) {
        const organization = await knex('organizations')
        .where('name', 'Primary organization')
        .select('organization_id')
        .first();

        const blockType = await knex('program_block_types')
        .where('description', 'Four weeks')
        .select('block_type_id')
        .first();

        const programId = await knex('programs')
        .transacting(t)
        .insert([{
            name: 'Internal Medicine',
            block_type_id: blockType.block_type_id,
            organization_id: organization.organization_id,
            created_by: 'sys',
            modified_by: 'sys'
        }]).returning('program_id');

        const programDirectorEmployee = await knex('employees')
        .join('users', 'employees.user_id', 'users.user_id')
        .where('email', 'nebojsa.pongracic@gmail.com')
        .select('employee_id')
        .first();

        const insertProgramDirectors = [
            {
                program_id: programId[0],
                employee_id: programDirectorEmployee.employee_id
            }
        ];

        await knex('program_directors')
        .transacting(t)
        .insert(insertProgramDirectors);

        try {
            await t.commit();
        }
        catch(exc) {
            await t.rollback();
        }

    }); 
};