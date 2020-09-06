
exports.seed = async function(knex) {
  const organization = await knex('organizations')
  .where('name', 'Primary organization')
  .select('organization_id')
  .first();

  const program = await knex('programs')
    .where('name', 'Internal Medicine')
    .andWhere('organization_id', organization.organization_id)
    .select('program_id')
    .first();

  const exists = await knex('courses')
    .where('name', 'Cyber Security')
    .andWhere('organization_id', organization.organization_id)
    .andWhere('program_id', program.program_id)
    .select('name');

  if(!exists || exists && exists.length == 0) {
    await knex('courses').insert([
      {
        organization_id: organization.organization_id, 
        program_id: program.program_id,
        name: 'Cyber Security',
        content_path: 'cyber-security/'
      },
    ]);
  }

};
