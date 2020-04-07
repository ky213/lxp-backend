
exports.seed = async function(knex) {
  return knex.transaction(async function(t) {
    const institutes = await knex('institutes').whereNotIn('institute_id', function() {
      this.select('institute_id').from('activity_types')
    }).select('institute_id');

    await knex('activity_types').transacting(t).del();

    for(let i = 0; i < institutes.length; i++) {
      await knex('activity_types').transacting(t).insert([
        {activity_type_id: 1, name: 'Half day', institute_id: institutes[i].institute_id },
        {activity_type_id: 2, name: 'Clinical round', institute_id: institutes[i].institute_id },
        {activity_type_id: 3, name: 'Inward patient supervision', institute_id: institutes[i].institute_id },
        {activity_type_id: 4, name: 'Procedural activity', institute_id: institutes[i].institute_id },
        {activity_type_id: 5, name: 'Case Presentation', institute_id: institutes[i].institute_id },
        {activity_type_id: 6, name: 'Research study', institute_id: institutes[i].institute_id },
        {activity_type_id: 7, name: 'Journal club', institute_id: institutes[i].institute_id },
        {activity_type_id: 8, name: 'Publication', institute_id: institutes[i].institute_id },
        {activity_type_id: 9, name: 'Case study', institute_id: institutes[i].institute_id },
        {activity_type_id: 10, name: 'Conference attendance', institute_id: institutes[i].institute_id },
        {activity_type_id: 11, name: 'Meeting', institute_id: institutes[i].institute_id },
        {activity_type_id: 12, name: 'Read resource', institute_id: institutes[i].institute_id },
      ]);
    }
  }).catch(err => {
    console.log('Create institute error:', err);
    throw err;
  });

  
};
