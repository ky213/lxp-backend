
exports.seed = async function(knex) {
    return await knex.transaction(async function(t) {
        const organization = await knex('organizations')
        .where('name', 'Primary organization')
        .select('organization_id')
        .first();

        const groupTypeId = await knex('group_types')
        .transacting(t)
        .insert([{
            name: 'Support Desk',
            organization_id: organization.organization_id
        }]).returning('group_type_id');

        const groupId = await knex('groups')
        .transacting(t)
        .insert([{
            name: 'IT',
            group_type_id: groupTypeId[0],
            organization_id: organization.organization_id,
            created_by: 'sys',
            modified_by: 'sys'
        }]).returning('group_id');

        const programDirectorEmployee = await knex('employees')
        .join('users', 'employees.user_id', 'users.user_id')
        .where('email', 'nebojsa.pongracic@gmail.com')
        .select('employee_id')
        .first();

        const insertProgramDirectors = [
            {
                group_id: groupId[0],
                employee_id: programDirectorEmployee.employee_id
            }
        ];

        await knex('groups_employee')
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