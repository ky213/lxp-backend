
exports.seed = async function(knex) {

  return await knex('activity_statuses').del()
    .then(function () {
        // Inserts seed entries
        return knex('activity_statuses').insert([
          {activity_status_id: 1, name: 'Pending'},
          {activity_status_id: 2, name: 'Active'},
          {activity_status_id: 3, name: 'Deleted'},
          {activity_status_id: 4, name: 'Accepted'},
          {activity_status_id: 5, name: 'Declined'},
        ]);
    });
};
