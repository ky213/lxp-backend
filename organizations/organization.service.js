﻿const config = require('config.json');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Role = require('helpers/role');
const knex = require('../db'); 
const groupTypeService = require('../group_type/group_type.service');
const groupsService = require('../groups/groups.service');

module.exports = {
    getAll,
    getById,
    create,
    update,
    getByName,
    deleteOrganizations,
    getDefaultGroup,
    sendEmail,
    sendTestMailDevEmail
};

async function getAll(user, pageId, recordsPerPage, filter) {
    //console.log("Get all organizations:", user, pageId, recordsPerPage, filter)
    let offset = ((pageId || 1) - 1) * recordsPerPage;

    let model = knex.table('organizations')
    .leftJoin('organization_settings', 'organization_settings.organization_id', 'organizations.organization_id');

    if (filter) {
        model.whereRaw(`LOWER(organizations.name) LIKE ?`, [`%${filter.toLowerCase().trim()}%`]);
    }

    const totalNumberOfRecords = await model.clone().count();
    //console.log("Total rows:", totalNumberOfRecords)
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const organizations = await model.clone()        
        .orderBy('organizations.is_active', 'desc')
        .orderBy('organizations.created_at', 'desc')
        .offset(offset)
        .limit(recordsPerPage)
        .select([
            'organizations.organization_id as organizationId', 
            'organizations.name', 
            'organizations.logo',
            'organizations.color_code as colorCode',       
            'organizations.background_color_code as backgroundColorCode',        
            'organizations.created_at as createdAt',
            'organizations.created_by as createdBy',
            'organizations.modified_at as modifiedAt',
            'organizations.modified_by as modifiedBy',
            'organizations.is_active as isActive',
            'organizations.default_group_id as defaultGroupId',
            'organization_settings.smtp_host as SMTPHost',
            'organization_settings.port_number as PortNumber',
            'organization_settings.encryption as Encryption',
            'organization_settings.email as Email',
            'organization_settings.label as Label',
            'organization_settings.server_id as ServerId',
            'organization_settings.password as Password',
            'organization_settings.subject as Subject',
            'organization_settings.body as Body'
        ]);
       
    //console.log("Got organizations:", organizations)
    return { organizations, totalNumberOfRecords: totalNumberOfRecords[0].count };
}

async function getById(id, user) {
    console.log('get by id ');
    let select =  knex.select([
        'organizations.organization_id as organizationId', 
        'organizations.name', 
        'organizations.logo',
        'organizations.color_code as colorCode',       
        'organizations.background_color_code as backgroundColorCode', 
        'organizations.created_at as createdAt',
        'organizations.created_by as createdBy',
        'organizations.modified_at as modifiedAt',
        'organizations.modified_by as modifiedBy',
        'organizations.is_active as isActive',
        'organizations.default_group_id as defaultGroupId',
        'organization_settings.smtp_host as SMTPHost',
        'organization_settings.port_number as PortNumber',
        'organization_settings.encryption as Encryption',
        'organization_settings.email as Email',
        'organization_settings.label as Label',
        'organization_settings.server_id as ServerId',
        'organization_settings.password as Password',
        'organization_settings.subject as Subject',
        'organization_settings.body as Body'
    ])
    .from('organizations')
    .leftJoin('organization_settings', 'organization_settings.organization_id', 'organizations.organization_id');

    let organization = await select
    .where('organizations.organization_id', id)
    .limit(1)
    .first();

    if(organization) {
        const groups = await knex.table('groups')
        .where('groups.group_id', organization.defaultGroupId)
        .select([
            'groups.group_id as groupId',
            'groups.name as name'
         ]);

         organization.groupIds = groups.map(d => ({
            name: d.name,
            groupId: d.groupId
        }));
    }

    return organization;
}

async function create(organization, user) {
    return knex.transaction(async function(t) {

        console.log("Got create organization:", organization, user)
        const organizationId = await knex('organizations')
        .transacting(t)
        .insert({
            name: organization.name,
            logo: organization.logo,
            color_code: organization.colorCode,
            background_color_code: organization.backgroundColorCode,
            created_by: user.sub,
            modified_by: user.sub,
            is_active: organization.isActive
        }).returning('organization_id');
        
        await knex('organization_settings')
        .transacting(t)
        .insert({
            organization_id: organizationId[0],
            smtp_host : organization.host,
            port_number : organization.port,
            encryption : organization.encryption,
            email : organization.email,
            label : organization.label,
            server_id : organization.serverId,
            password : organization.password,
            subject : organization.subject,
            body: organization.body,
            created_at: knex.fn.now(),
            created_by: user.sub,
            modified_by: user.sub
            }).returning('settings_id');

        let blockType = await knex('program_block_types')
            .where('description', 'Four weeks')
            .select('block_type_id')
            .first();

        await knex('programs')
        .transacting(t)
        .insert({
                name: 'Default Program',
                organization_id: organizationId[0],
                created_by: user.sub,
                modified_by: user.sub,
                block_type_id: blockType.block_type_id
            }).returning('program_id'); 
        
        let groupType = await knex('group_types')
        .transacting(t)
        .insert({
            name: 'Default',
            organization_id: organizationId[0]
        }).returning('group_type_id');

        let groupId = await knex('groups')
        .transacting(t)
        .insert({
            name: 'Users',
            group_type_id: groupType[0],
            description: 'Users Default Group',
            organization_id: organizationId[0],
            created_by: user.sub,
            modified_by: user.sub,
            is_active: true
        }).returning('group_id');  

        await knex('organizations')
        .where('organization_id', organizationId[0])
        .transacting(t)
        .update({
            default_group_id:  groupId[0]
        });

        await knex('activity_types')
        .transacting(t)
        .insert([
            {activity_type_id: 1, name: 'Half day', organization_id: organizationId[0] },
            {activity_type_id: 2, name: 'Clinical round', organization_id: organizationId[0] },
            {activity_type_id: 3, name: 'Inward patient supervision', organization_id: organizationId[0] },
            {activity_type_id: 4, name: 'Procedural activity', organization_id: organizationId[0] },
            {activity_type_id: 5, name: 'Case Presentation', organization_id: organizationId[0] },
            {activity_type_id: 6, name: 'Research study', organization_id: organizationId[0] },
            {activity_type_id: 7, name: 'Journal club', organization_id: organizationId[0] },
            {activity_type_id: 8, name: 'Publication', organization_id: organizationId[0] },
            {activity_type_id: 9, name: 'Case study', organization_id: organizationId[0] },
            {activity_type_id: 10, name: 'Conference attendance', organization_id: organizationId[0] },
            {activity_type_id: 11, name: 'Meeting', organization_id: organizationId[0] },
            {activity_type_id: 12, name: 'Read resource', organization_id: organizationId[0] },
          ]);
    })
    .catch(err => {
        console.log('Create organization error:', err);
        throw err;
    });
}

async function update(organization, user)
{
    return knex.transaction(async function(t) {
        console.log("Got update user:", user);

        await knex('organizations')
            .where('organization_id', organization.organizationId)
            .transacting(t)
            .update({
                name: organization.name,
                logo: organization.logo,
                color_code: organization.colorCode,
                background_color_code: organization.backgroundColorCode,
                modified_at: knex.fn.now(),
                modified_by: user.sub,
                is_active: organization.isActive,
                default_group_id:  organization.defaultGroupId
            });

        await knex('organization_settings')
            .where('organization_id', organization.organizationId)
            .transacting(t)
            .update({
                modified_at: knex.fn.now(),
                modified_by: user.sub,
                smtp_host : organization.host,
                port_number : organization.port,
                encryption : organization.encryption,
                email : organization.email,
                label : organization.label,
                server_id : organization.serverId,
                password : organization.password,
                subject : organization.subject,
                body : organization.body
            });    
    })
    .catch(err => console.log('Update organization error', err));
}

async function getByName(name, user) {
    return await knex.select([
        'organizations.organization_id as organizationId', 
        'organizations.name', 
        'organizations.logo',
        'organizations.color_code as colorCode',       
        'organizations.background_color_code as backgroundColorCode', 
        'organizations.created_at as createdAt',
        'organizations.created_by as createdBy',
        'organizations.modified_at as modifiedAt',
        'organizations.modified_by as modifiedBy',
        'organizations.is_active as isActive',
        'organizations.default_group_id as defaultGroupId',
        'organization_settings.smtp_host as SMTPHost',
        'organization_settings.port_number as PortNumber',
        'organization_settings.encryption as Encryption',
        'organization_settings.email as Email',
        'organization_settings.label as Label',
        'organization_settings.server_id as ServerId',
        'organization_settings.password as Password',
        'organization_settings.subject as Subject',
        'organization_settings.body as Body'
    ])
    .from('organizations')
    .leftJoin('organization_settings', 'organization_settings.organization_id', 'organizations.organization_id')
    .whereRaw(`LOWER(organizations.name) = ?`, [`${name.toLowerCase().trim()}`])
    .limit(1)
    .first();
}

async function deleteOrganizations(organizations, user)
{
    console.log("Got delete organizations:", organizations, user)
    return knex('organizations')
        .whereIn('organization_id', organizations)
        .update({
            is_active: false
        });
}

async function getDefaultGroup(id) {    
    let select = knex.select([
        'organizations.organization_id as organizationId', 
        'organizations.name', 
        'organizations.logo',
        'organizations.color_code as colorCode',       
        'organizations.background_color_code as backgroundColorCode', 
        'organizations.created_at as createdAt',
        'organizations.created_by as createdBy',
        'organizations.modified_at as modifiedAt',
        'organizations.modified_by as modifiedBy',
        'organizations.is_active as isActive',
        'organizations.default_group_id as defaultGroupId'
    ])
    .from('organizations');
    
    let organization = await select
        .where('organizations.organization_id', id)
        .limit(1)
        .first();

    return organization;
}

async function sendEmail( email, user )
{
    console.log('email   => ' , email , user );

    let select =  knex.select([
        'organizations.organization_id as organizationId', 
        'organizations.name', 
        'organization_settings.smtp_host as SMTPHost',
        'organization_settings.port_number as PortNumber',
        'organization_settings.encryption as Encryption',
        'organization_settings.email as Email',
        'organization_settings.label as Label',
        'organization_settings.server_id as ServerId',
        'organization_settings.password as Password',
        'organization_settings.subject as Subject',
        'organization_settings.body as Body'
    ])
    .from('organizations')
    .leftJoin('organization_settings', 'organization_settings.organization_id', 'organizations.organization_id');

    let organization = await select
    .where('organizations.organization_id', email.organizationId)
    .limit(1)
    .first();

    if(organization && organization.Email)
    {       
        let transporterOption = {};
        
        if(organization.Encryption && organization.Encryption !== 'None')
        {
            transporterOption = {
                host: organization.SMTPHost, 
                port: organization.PortNumber, 
                secure: true, // use TLS , SSL
                auth: {
                    user: organization.ServerId,
                    pass: organization.Password
                }
            };
        }
        else{            
            transporterOption = {
                host: organization.SMTPHost, 
                port: organization.PortNumber, 
                // We add this setting to tell nodemailer the host isn't secure during dev:
                ignoreTLS: true
            };          
        }

        const transporter = nodemailer.createTransport(transporterOption);
  
        const replacements = { OrgName: organization.name , UserName: organization.Label};
        const body = organization.Body.replace(/{\w+}/g, placeholder =>
        replacements[placeholder.substring(1, placeholder.length - 1)] || placeholder, );

        // Now when your send an email, it will show up in the MailDev interface
        const message = {
            from: organization.Label + ' ' +  organization.Email,  // Sender address
            to: email.to ,   // List of recipients
            subject: organization.Subject, // Subject line
            html: body
        };

        transporter.sendMail(message, function(err, info) {
            if (err) {
                console.log(err)
            } else {
                console.log(info);
            }
        }); 
    }
}

async function sendTestMailDevEmail(email, user)
{ 
    console.log(' email =>  ' , email)
    if(email)
    {
        const transporter = nodemailer.createTransport({
            host: 'maildev',
            port: 25 ,
            // We add this setting to tell nodemailer the host isn't secure during dev:
            ignoreTLS: true
        });
      
        // Now when your send an email, it will show up in the MailDev interface

        const message = {
            from: email.Label + ' ' +  email.from, 
            to: email.to , 
            subject: 'Test Email', // Subject line
            text: 'Have a nice day!' ,// Plain text body
            html: '<br/> <b>Hey there! </b><br> This is our first message sent with Nodemailer'
        };

        transporter.sendMail(message, function(err, info) {
            if (err) {
                console.log(err)
            } else {
                console.log(info);
            }
        }); 
    }
}

