exports.up = function(knex) {
  return knex.schema.createTable('competencies_tags', table => {
    table
      .uuid('competencies_tags_id').defaultTo(knex.raw('uuid_generate_v4()'))  
      .primary();
    table.uuid('competency_id').notNullable();
    table.uuid('organization_id').notNullable();
    table.integer('activity_type_id').nullable();
    table.uuid('activity_id').nullable();
    table.uuid('log_activity_id').nullable();
    table.uuid('course_id').nullable();
    
    table.foreign('competency_id').references('competency_id').inTable('competencies');
    table.foreign('organization_id').references('organization_id').inTable('organizations');  
    table.foreign('course_id').references('course_id').inTable('courses');    
    table.foreign('activity_id').references('activity_id').inTable('activities');
    table.foreign('log_activity_id').references('log_activity_id').inTable('log_activities');
    table.foreign(['activity_type_id', 'organization_id']).references(['activity_type_id', 'organization_id']).inTable('activity_types');   

    table.unique(['competency_id', 'activity_type_id', 'organization_id']);
    table.unique(['competency_id', 'activity_id', 'organization_id']);
    table.unique(['competency_id', 'log_activity_id', 'organization_id']);
    table.unique(['competency_id', 'course_id', 'organization_id']);

  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('competencies_tags');
};
