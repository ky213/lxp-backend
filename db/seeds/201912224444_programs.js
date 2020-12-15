exports.seed = async function(knex) {
  // Deletes ALL existing entries
  let programs = await knex("programs").select(["program_id", "is_active"]);

  await asyncForEach(programs, async e => {
    if (e.is_active) {
      await knex("programs")
        .where("program_id", e.program_id)
        .update({
          is_default: true
        });
    }
  });

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
};
