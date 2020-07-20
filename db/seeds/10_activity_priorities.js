
exports.seed = async function(knex) {

  return await knex('activity_priorities').del()
    .then(function () {
        // Inserts seed entries
        return knex('activity_priorities').insert([
          {priority_id: 1, name: 'Program'},
          {priority_id: 2, name: 'Level'},
          {priority_id: 3, name: 'Learner'},
        ]);
    });
};
