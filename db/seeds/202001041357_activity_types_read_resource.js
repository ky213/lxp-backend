
exports.seed = async function(knex) {

  const exists = await knex('activity_types').where('activity_type_id', '12').select('name');
  if(!exists || exists && exists.length == 0) {
    await knex('activity_types').insert([
      {activity_type_id: 12, name: 'Read resource'},
    ]);
  }

};
