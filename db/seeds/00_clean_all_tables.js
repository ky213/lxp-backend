
exports.seed = async function(knex) {
  await knex.schema.raw('TRUNCATE TABLE employee_roles, roles, program_directors, programs, employees, users, institutes CASCADE');
  await knex.schema.raw('TRUNCATE TABLE blocks, program_block_types, academic_years, calendar_events, calendar_event_statuses CASCADE');

  await knex.schema.raw('TRUNCATE TABLE activity_priorities, activity_repeat_types, activity_types, activities, activity_statuses, experience_levels CASCADE');
  
}