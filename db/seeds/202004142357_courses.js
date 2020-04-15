
exports.seed = async function(knex) {
  const institute = await knex('institutes')
  .where('name', 'Primary institute')
  .select('institute_id')
  .first();

  const program = await knex('programs')
    .where('name', 'Internal Medicine')
    .andWhere('institute_id', institute.institute_id)
    .select('program_id')
    .first();

  const exists = await knex('courses')
    .where('name', 'Cyber Security')
    .andWhere('institute_id', institute.institute_id)
    .andWhere('program_id', program.program_id)
    .select('name');

  if(!exists || exists && exists.length == 0) {
    await knex('courses').insert([
      {
        institute_id: institute.institute_id, 
        program_id: program.program_id,
        name: 'Cyber Security',
        content_path: '/cyber-security/'
      },
    ]);
  }

};
