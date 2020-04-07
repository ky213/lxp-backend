exports.seed = async function(knex) {
  // Deletes ALL existing entries
  let employees = await knex("employees").select(["user_id", "profile_photo"]);

  await asyncForEach(employees, async e => {
    if (e.profile_photo) {
      await knex("users")
        .where("user_id", e.user_id)
        .update({
          profile_photo: e.profile_photo
        });
    }
  });

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
};
