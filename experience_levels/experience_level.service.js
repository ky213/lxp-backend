const knex = require('../db'); 

module.exports = {
  getAll,
  getByExpLevelId,
  getByProgramId,  
  add,
  update,
  deleteExpLevel,
  getExpLevelIdByExpLevelName
};

async function getAll(user) {
  return await knex
    .table("experience_levels")
    .select([
      "experience_levels.exp_level_id as expLevelId",
      "experience_levels.name"
    ]);
}

async function getByExpLevelId(user, expLevelId) {
  return await knex
    .table("experience_levels")
    .where("experience_levels.exp_level_id", expLevelId)
    .select([
      "experience_levels.exp_level_id as expLevelId",
      "experience_levels.name"
    ]);
}

async function getByProgramId(user, programId) {
  let { maxExpLevel, minExpLevel } = await knex("programs")
    .where("program_id", programId)
    .select(['max_experience_level as maxExpLevel', 'min_experience_level as minExpLevel'])
    .first();
  
  let query = knex
    .table("experience_levels")
    .select([
      "experience_levels.exp_level_id as expLevelId",
      "experience_levels.name"
    ])
    .orderBy('experience_levels.name');
  let offset = 0;

  if (minExpLevel)
  {
    offset = minExpLevel - 1;
    query.offset(offset);
  }

  if (minExpLevel)
    query.limit(maxExpLevel - offset);

  return await query;
}

async function add(user, exp_level) {
  return await knex.table('experience_levels')
    .insert(exp_level);    
}

async function update(user, expLevelId, name) {
  return await knex.table('experience_levels')
    .where('exp_level_id', expLevelId)
    .update({
      name
  });
}

async function deleteExpLevel(user, expLevelId) {
  return await knex.table('experience_levels')
    .where('exp_level_id', expLevelId)
    .del();
}

async function getExpLevelIdByExpLevelName(programId, expLevelName) {
  return await knex("experience_levels")
    .andWhere("name", expLevelName)
    .select("exp_level_id as expLevelId")
    .first();
}