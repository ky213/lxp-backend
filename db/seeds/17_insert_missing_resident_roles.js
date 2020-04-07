
exports.seed = async function(knex) {
  let employeeIds = await knex('employees')
    .whereNotExists(function() {
      this.select('*').from('employee_roles').whereRaw('employees.employee_id = employee_roles.employee_id');
    })
    .andWhere('is_resident', true)
    .select(['employee_id']);

  await asyncForEach(employeeIds, async e => {
    await knex('employee_roles')
      .insert({employee_id: e.employee_id,
        role_id: 'Resident'}
      );
  });

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
};
