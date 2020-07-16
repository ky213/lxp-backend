
exports.seed = async function(knex) {
  return knex.transaction(async function(t) {
    const organizations = await knex('organizations').whereNotIn('organization_id', function() {
      this.select('organization_id').from('activity_types')
    }).select('organization_id');

    await knex('activity_types').transacting(t).del();

    for(let i = 0; i < organizations.length; i++) {
      await knex('activity_types').transacting(t).insert([
        {activity_type_id: 1, name: 'Half day', organization_id: organizations[i].organization_id },
        {activity_type_id: 2, name: 'Clinical round', organization_id: organizations[i].organization_id },
        {activity_type_id: 3, name: 'Inward patient supervision', organization_id: organizations[i].organization_id },
        {activity_type_id: 4, name: 'Procedural activity', organization_id: organizations[i].organization_id },
        {activity_type_id: 5, name: 'Case Presentation', organization_id: organizations[i].organization_id },
        {activity_type_id: 6, name: 'Research study', organization_id: organizations[i].organization_id },
        {activity_type_id: 7, name: 'Journal club', organization_id: organizations[i].organization_id },
        {activity_type_id: 8, name: 'Publication', organization_id: organizations[i].organization_id },
        {activity_type_id: 9, name: 'Case study', organization_id: organizations[i].organization_id },
        {activity_type_id: 10, name: 'Conference attendance', organization_id: organizations[i].organization_id },
        {activity_type_id: 11, name: 'Meeting', organization_id: organizations[i].organization_id },
        {activity_type_id: 12, name: 'Read resource', organization_id: organizations[i].organization_id },
      ]);
    }
  }).catch(err => {
    console.log('Create organization error:', err);
    throw err;
  });

  
};
