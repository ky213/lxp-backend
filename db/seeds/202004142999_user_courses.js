
exports.seed = async function(knex) {
  return await knex.transaction(async function(t) {
    const users = await knex('users')
    .where('name', 'Jon')
    .andWhere('email', 'learner1@primaryorganization.com')
    .andWhere('is_super_admin', 0)
    .select('user_id')
    .first();

  const courses = await knex('courses')
    .where('name', 'Cyber Security')
    .select('course_id')
    .first();

  await knex('user_courses')
  .transacting(t)
  .insert([{user_id: users.user_id,  course_id: courses.course_id, is_able_to_join: true, joining_date:'2020-07-28T00:00:00.000Z'},]); 

    try {
        await t.commit();
    }
    catch(exc) {
        await t.rollback();
    }

}); 
};
