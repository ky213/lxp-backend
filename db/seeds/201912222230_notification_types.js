
exports.seed = async function(knex) {

  return await knex('notification_types').del()
    .then(function () {
        // Inserts seed entries
        return knex('notification_types').insert([
          {notification_type_id: 1, type: 'INFO', name: 'Info'},
          {notification_type_id: 2, type: 'WARNING', name: 'Warning'},
          {notification_type_id: 3, type: 'ERROR', name: 'Error'}
        ]);
    });
};
