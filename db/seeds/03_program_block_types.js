
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('program_block_types').del()
    .then(function () {
      // Inserts seed entries
      return knex('program_block_types')
      .insert([
        {description: 'Four weeks'},
        {description: 'Month'}
      ]);
    });
};
