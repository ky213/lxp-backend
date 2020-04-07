
exports.seed = async function(knex) {

  return await knex('activity_participation_levels').del()
    .then(function () {
        // Inserts seed entries
        return knex('activity_participation_levels').insert([
          {participation_level: 1, type: 'Observer'},
          {participation_level: 2, type: 'Assisting'},
          {participation_level: 3, type: 'Supervised Operator'},
          {participation_level: 4, type: 'Dependable operator'}
        ]);
    });
};
