const knex = require('../db');
const converter = require("helpers/converter");
const PermissionsService = require('permissions/permissions.service')
const Permissions = require('permissions/permissions')

module.exports = {
  getAll,
  getById,
  getByUser,
  create,
  update,
  addFile,
  deleteFile,
  downloadFile,
  markAnnouncementAsRead,
  deleteAnnouncements
};

async function getAll(loggedInUser, selectedOrganizationId) {
  return knex('announcements')
    .leftJoin('announcement_files', 'announcement_files.announcement_id', 'announcements.announcement_id')
    .where('announcements.organization_id', PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId ? selectedOrganizationId : loggedInUser.organization)
    .groupBy('announcements.announcement_id')
    .select([
      'announcements.announcement_id as announcementId',
      'announcements.title as title',
      'announcements.text as text',
      'announcements.date_from as dateFrom',
      'announcements.date_to as dateTo',
      'announcements.is_active as isActive'
    ])
    .count('announcement_files.* as fileNum');
}

async function getById(loggedInUser, announcementId, organizationId) {

  // console.log('announcements.getById', loggedInUser, announcementId, organizationId);

  organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && organizationId) ? organizationId : loggedInUser.organization;

  if (!announcementId)
    return null;

  let data = await knex('announcements')
    .where('organization_id', organizationId)
    .andWhere('announcement_id', announcementId)   
    .first();

  let programs = await knex('announcement_programs')
    .join('programs', 'programs.program_id', 'announcement_programs.program_id')
    .where('announcement_id', announcementId)
    .select(['programs.program_id as programId', 'programs.name']);

  let roles = await knex('announcement_roles')
    .join('roles', 'roles.role_id', 'announcement_roles.role_id')
    .where('announcement_id', announcementId)
    .select(['roles.role_id', 'roles.name']);

  let files = await knex("announcement_files")
    .where("announcement_id", announcementId)
    .select([
      "announcement_files.name",
      "announcement_files.size",
      "announcement_files.announcement_file_id as announcementFileId"
    ]);

  return {
    announcementId: data.announcement_id,
    title: data.title,
    text: data.text,
    dateFrom: data.date_from,
    dateTo: data.date_to,
    isActive: data.is_active,
    organization_id: organizationId,
    programs,
    roles,
    files: files.map(x => ({...x, size: converter.bytesToSize(x.size)}))
  }
}

async function getByUser(loggedInUser, includeRead, selectedOrganizationId) {
  
  if (!loggedInUser)
    return;    

  if(!loggedInUser.userId) {
    return;
  }

  let organizationId = (PermissionsService.isSuperAdmin(loggedInUser) && selectedOrganizationId) ? selectedOrganizationId : loggedInUser.organization;
  
  includeRead = includeRead || false;

  var currentDate = new Date();  

  let query = knex('announcements')
    .leftJoin('announcement_files', 'announcement_files.announcement_id', 'announcements.announcement_id')
    .where('announcements.organization_id', organizationId)
    .andWhere('announcements.is_active', true)
    .andWhere(function() {
      includeRead || 
      this.whereNotExists(function() {
        this.from('user_announcement_reads')
          .where('user_announcement_reads.user_id', loggedInUser.userId)
          .andWhereRaw(
            "user_announcement_reads.announcement_id = announcements.announcement_id"
          )    
          .select('*')
      })
    })
    .andWhere(function() {
      this.whereNull('announcements.date_from')
      this.orWhere('announcements.date_from', '<=', currentDate)
    })
    .andWhere(function() {
      this.whereNull('announcements.date_to')
      this.orWhere('announcements.date_to', '>=', currentDate)
    });    

    if (PermissionsService.isSuperAdmin(loggedInUser)) {
      query.andWhere(function() {
        this.whereNotExists(function() {
          this.from("announcement_roles")
            .select("*")
            .whereRaw(
              'announcement_roles.announcement_id = announcements.announcement_id'
            )          
        })
      })     
      .andWhere(function() {
        this.whereNotExists(function() {
          this.from("announcement_programs")
            .select("*")
            .whereRaw(
              "announcement_programs.announcement_id = announcements.announcement_id"
            )          
        })
      })
    }
    else {
      // provjeravamo da li je announcement za neku Rolu
      query.andWhere(function() {
        this.whereNotExists(function() {
          this.from("announcement_roles")
            .select("*")
            .whereRaw(
              'announcement_roles.announcement_id = announcements.announcement_id'
            )          
        })
        this.orWhereExists(function() {
          this.from("employee_roles")
            .join(
              "announcement_roles",
              "announcement_roles.role_id",
              "employee_roles.role_id"
            )
            .where('employee_roles.employee_id', loggedInUser.employeeId)
            .select("*")
        })
      })
    }

    if (PermissionsService.hasPermission(loggedInUser, Permissions.api.announcements.for.learners)) {
      // provjeravamo da li je announcement za neki Program
      query.andWhere(function() {
        this.whereNotExists(function() {
          this.from("announcement_programs")
            .select("*")
            .whereRaw(
              "announcement_programs.announcement_id = announcements.announcement_id"
            )          
        })
        this.orWhereExists(function() {
          this.from("employee_programs")
            .join(
              "announcement_programs",
              "announcement_programs.program_id",
              "employee_programs.program_id"
            )
            .where('employee_programs.employee_id', loggedInUser.employeeId)
            .select('*')
        })
      })
    }

    if (PermissionsService.hasPermission(loggedInUser, Permissions.api.announcements.for.programmanegers)) {
      // provjeravamo da li je announcement za neki Program
      query.andWhere(function() {
        this.whereNotExists(function() {
          this.from("announcement_programs")
            .select("*")
            .whereRaw(
              "announcement_programs.announcement_id = announcements.announcement_id"
            )          
        })
        this.orWhereExists(function() {
          this.from("program_directors")
            .join(
              "announcement_programs",
              "announcement_programs.program_id",
              "program_directors.program_id"
            )
            .where('program_directors.employee_id', loggedInUser.employeeId)
            .select('*')
        })
      })
    }

    let announcements = await query
      .groupBy('announcements.announcement_id')
      .select([
        'announcements.announcement_id as announcementId',
        'announcements.title as title',
        'announcements.text as text',
        'announcements.date_from as dateFrom',
        'announcements.date_to as dateTo'   
      ]);

    var ids = announcements.map(x => x.announcementId);
    let files = await knex("announcement_files")
      .whereIn("announcement_id", ids)
      .select([
        'announcement_files.announcement_id as announcementId',
        "announcement_files.name",
        "announcement_files.size",
        "announcement_files.announcement_file_id as announcementFileId"
      ]);
    
    //console.log('announcements', announcements);

    return {
      announcements,
      files: files.map(x => ({...x, size: converter.bytesToSize(x.size)}))
    }
}

async function create(loggedInUser, data) {
  return knex
  .transaction(async function(t) {
    const ids = await knex("announcements")
      .transacting(t)
      .insert({
        title: data.title,
        text: data.text,
        date_from: data.dateFrom,
        date_to: data.dateTo,
        is_active: data.isActive,
        organization_id: data.organizationId
      })
      .returning("announcement_id");
    
    if (!ids || ids.length !== 1)
      throw "Failed to insert announcement";
      
    /* PROGRAMS */
    let queryAnnPrograms = [];    
    data.programs.map(programId => {
      queryAnnPrograms.push({
        announcement_id: ids[0],
        program_id: programId        
      })
    })

    if (queryAnnPrograms.length > 0)
    {
      await knex("announcement_programs")
        .transacting(t)
        .insert(queryAnnPrograms);
    }

   
    /* ROLES */
    let queryRoles = [];    
    data.roles.map(roleId => {
      queryRoles.push({
        announcement_id: ids[0],
        role_id: roleId        
      })
    })

    if (queryRoles.length > 0)
    {
      await knex("announcement_roles")
        .transacting(t)
        .insert(queryRoles);
    }

    console.log('return id', ids[0]);
    return ids[0];
  });
}

async function update(loggedInUser, data) {
  console.log('update', data);
  return knex
  .transaction(async function(t) {
    await knex("announcements")
      .transacting(t)
      .where('announcement_id', data.announcementId)
      .update({
        title: data.title,
        text: data.text,
        date_from: data.dateFrom,
        date_to: data.dateTo,
        is_active: data.isActive
      });
    
    /* PROGRAMS */
    let queryAnnPrograms = [];    
    data.programs.map(programId => {
      queryAnnPrograms.push({
        announcement_id: data.announcementId,
        program_id: programId        
      })
    })

    await knex("announcement_programs")
      .transacting(t)
      .where('announcement_id', data.announcementId)
      .del();

    if (queryAnnPrograms.length > 0)
    {
      await knex("announcement_programs")
        .transacting(t)
        .insert(queryAnnPrograms);
    }
 

    /* ROLES */
    let queryRoles = [];    
    data.roles.map(roleId => {
      queryRoles.push({
        announcement_id: data.announcementId,
        role_id: roleId        
      })
    })

    await knex("announcement_roles")
      .transacting(t)
      .where('announcement_id', data.announcementId)
      .del();

    if (queryRoles.length > 0)
    {
      await knex("announcement_roles")
        .transacting(t)
        .insert(queryRoles);
    }

    await knex("user_announcement_reads")
        .transacting(t)
        .where('announcement_id', data.announcementId)
        .del();
  });
}

async function addFile(loggedInUser, data) {
  console.log('addFile', data);

  return await knex('announcement_files')
    .insert({
      announcement_id: data.announcementId,
      file: Buffer.from(data.file),
      name: data.name,
      type: data.type,
      extension: data.extension,
      size: data.size
    })
    .returning('announcement_file_id');
}

async function deleteFile(loggedInUser, id) {
  console.log('deleteFile => ', id);
  
  return knex("announcement_files")
    .where("announcement_file_id", id)
    .del();
}

async function downloadFile(loggedInUser, id) {
  console.log('downloadFile => ', id);
  return knex("announcement_files")
    .where("announcement_file_id", id)
    .select([
      "announcement_files.name",
      "announcement_files.file"      
    ])
    .first();
}

async function markAnnouncementAsRead(loggedInUser, announcementId) {
  return knex('user_announcement_reads').insert({
    user_id: loggedInUser.userId,
    announcement_id: announcementId
  });
}

async function deleteAnnouncements(loggedInUser, announcements) {
  console.log("Delete announcement service: ", announcements); 

  return knex
  .transaction(async function(t) {
    await knex("user_announcement_reads")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();
    
    await knex("announcement_files")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();

    await knex("announcement_roles")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();

    await knex("announcement_programs")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();

    await knex("announcements")
      .transacting(t)
      .whereIn("announcement_id", announcements)
      .del();
  });
}
