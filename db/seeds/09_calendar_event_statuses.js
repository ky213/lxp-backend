
exports.seed = async function(knex) {

  return await knex('calendar_event_statuses').del()
    .then(function () {
        // Inserts seed entries
        return knex('calendar_event_statuses').insert([
          {status: 'Requested'},
          {status: 'Accepted'},
          {status: 'Declined'},
        ]);
    });
};
