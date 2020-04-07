
exports.seed = async function(knex) {

  return await knex('notification_channel_types').del()
    .then(function () {
        // Inserts seed entries
        return knex('notification_channel_types').insert([
          {notification_channel_type_id: 1, type: 'APP', name: 'In-app notifications'},
          {notification_channel_type_id: 2, type: 'EMAIL', name: 'E-mail notifications'},
          //{notification_channel_type_id: 3, type: 'SMS', name: 'SMS notifications'}
        ]);
    });
};
