
exports.seed = async function(knex) {
  let x = await knex('institutes')
    .select('institute_id')
    .first();

  let prog = await knex('programs')
    .select('program_id')
    .first();

  return await knex('academic_years').del()
    .then(function () {
      // Inserts seed entries
      return knex('academic_years').insert(
        {institute_id: x.institute_id, program_id: prog.program_id, name: '2019/2020', start_date: '2019-09-01T00:00:00.000Z', 
        end_date:'2020-08-31T00:00:00.000Z'}
      );
    });
};
