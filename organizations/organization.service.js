const config = require('config.json');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Role = require('helpers/role');
const knex = require('../db'); 
const htmlPdf  = require('html-pdf');
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
    sendTestEmail,
    getOrganizationSettingsByOrgId
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
            'organizations.domain', 
            'organization_settings.settings_id as SettingsId',
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

async function getOrganizationSettingsByOrgId(id) {

    let select =  knex.select([
        'organization_settings.settings_id as SettingsId',
        'organization_settings.smtp_host as SMTPHost',
        'organization_settings.port_number as PortNumber',
        'organization_settings.encryption as Encryption',
        'organization_settings.email as Email',
        'organization_settings.label as Label',
        'organization_settings.server_id as ServerId',
        'organization_settings.password as Password',
        'organization_settings.subject as Subject',
        'organization_settings.body as Body',
        'organization_settings.assetsDomain as assetsDomain',
    ])
        .from('organization_settings');

    let organizationSettings = await select
        .where('organization_settings.organization_id', id)
        .limit(1)
        .first();

    return organizationSettings;
}

async function getById(id, user) {
    console.log('get by id');
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
        'organizations.domain', 
        'organization_settings.settings_id as SettingsId',
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
            is_active: organization.isActive,
            domain : organization.domain
        }).returning('organization_id');

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
                default_group_id:  organization.defaultGroupId,
                domain : organization.domain
            });

        if (organization.SettingsId) {
            await knex('organization_settings')
                .where('settings_id', organization.SettingsId)
                .transacting(t)
                .update({
                    modified_at: knex.fn.now(),
                    modified_by: user.sub,
                    smtp_host : organization.SMTPHost,
                    port_number : organization.PortNumber,
                    encryption : organization.Encryption,
                    email : organization.Email,
                    label : organization.Label,
                    server_id : organization.ServerId,
                    password : organization.Password,
                    subject : organization.Subject,
                    body: organization.Body
                });}
        else if(organization.SettingsId == null && organization.ServerId) {
            await knex('organization_settings')
            .transacting(t)
            .insert({
                organization_id: organization.organizationId,
                smtp_host : organization.SMTPHost,
                port_number : organization.PortNumber,
                encryption : organization.Encryption,
                email : organization.Email,
                label : organization.Label,
                server_id : organization.ServerId,
                password : organization.Password,
                subject : organization.Subject,
                body: organization.Body,
                created_at: knex.fn.now(),
                created_by: user.sub,
                modified_by: user.sub
            }).returning('settings_id');
        }
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
        'organizations.domain', 
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
        'organizations.default_group_id as defaultGroupId',
        'organizations.domain'
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
    if (!user)
        return;

    console.log('email   => ' , email , user );
    let organizationId = email.organizationId || user.organization;

    let select =  knex.select([
        'organizations.organization_id as organizationId', 
        'organizations.name as Name', 
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
    .where('organizations.organization_id', organizationId)
    .limit(1)
    .first();

    let courses = [];
    if(email.CourseId && email.isCertificate !== 'TRUE')
    {
        let model = knex('courses')
        .join('user_courses', 'user_courses.course_id', 'courses.course_id')
        .join('programs', 'programs.program_id', 'courses.program_id')
        .join('users', 'user_courses.user_id', 'users.user_id')
        .where('user_courses.user_id', email.UserId)
        .andWhere('user_courses.course_id', email.CourseId)
        .andWhere('user_courses.is_able_to_join', true);    

        courses = await model.clone()
        .select([
            'courses.name as Name',
            'users.email as Email',
            'users.name as UserName',
            'users.surname as UserLastName',
            'programs.subject as Subject',
            'programs.body as Body',
        ]);
    }

    let userEmail = email.UserEmail;     
    let userName = email.UserName;    
    let userLastName = email.UserLastName;  
    let emailBody =  organization.Body;
    let emailSubject =  organization.Subject;
    let courseName;
    let certificateAttachment;
    let body;

    if(organization && organization.Email)
    {
        if (email.isCertificate == 'TRUE')
        {
            //emailBody = email.Body;
            emailBody = '<p style="text-align: center;font-family:arial;font-size:14px;"><img class="wp-image-12 alignnone" src="https://mcqauthor.com/wp-content/uploads/2020/02/logo2_250-300x129.png" alt="" width="193" height="83" align="center" /> </p>' + 
            '</br></br>' +
            '<p style="text-align: center;font-family:arial;font-size:14px;">This certifies that </br>' +
			'<strong>{UserName} {UserLastName}</strong> </br>' +
            'has fulfilled Phase I of the Item Author Certification Program </p>' + 
            '<p style="font-family:arial;font-size:14px;">A message will be sent to your e-mail within a week to access the Item Development System (IDS) for Phase II. After you receive the email from IDS, log in details are:' + 
            '</br>Username: Email Address </br> Password: Abcd1234</p>' + 
            '<p style="font-family:arial;font-size:9px;"><sup>*Note: Please change the password after the first login</sup></p>' + 
            '<p style="font-family:arial;font-size:14px;"><strong>Phase II Details:</strong></p>' + 
            '<p style="font-family:arial;font-size:14px;">You are requested to submit 5 MCQ’s based on what you have learned in Phase I. Items can be written in any field but must comply with SCFHS guidelines.' + 
            '</br>After submission, items will be reviewed by the Editorial Team. The reviewed task will appear in your account in the tab “Reviewed Tasks” and you must review and accept to fulfill IAC Phase II.</p>' + 
            '<p style="font-family:arial;font-size:14px;"><strong>Certification Criteria:</strong></p>' + 
            '<p style="font-family:arial;font-size:14px;">*4-5 accepted items = Certified' + 
            '</br>*2-5 rejected items = Review feedback and request a make-up task to redo and re-submit.</p>' + 
            '<p style="font-family:arial;font-size:9px;"><sup>*For any inquiries, contact us: <a href=“mailto:IAC@scfhs.org”>IAC@scfhs.org</a></sup></p>'
            emailSubject = email.Subject;
            courseName = email.CourseName;                
        }
        else if (courses && courses[0])
        {   
            emailBody =  courses[0].Body;
            emailSubject =  courses[0].Subject;
            userEmail = courses[0].Email;
            userName = courses[0].UserName;
            userLastName = courses[0].UserLastName;
            courseName = courses[0].Name;
        }
        else if (email.isReset == 'TRUE')
        {
            emailBody =  email.Body;
            emailSubject =  email.Subject;
        }          

        const replacements = { OrgName: organization.Name , UserName: userName, UserLastName: userLastName,
            UserLogin: userEmail, UserPass: email.UserPass , UserCourse : courseName};

        body = emailBody ? emailBody.replace(/{\w+}/g, placeholder =>
        replacements[placeholder.substring(1, placeholder.length - 1)] || placeholder, ) : null ;
            
        if(body && email.isCertificate == 'TRUE')
        {
            const htmlPDF = await htmlToPdfBuffer(body);
            certificateAttachment  = { filename: "Certificate.pdf", content: htmlPDF , contentType: 'application/pdf' }
        } 
    }

    if(organization && organization.Email)
    {       
        return new Promise((resolve,reject)=>{
            let transporterOption = {};
            
            if(organization.Encryption)
            {
                transporterOption = {
                    host: organization.SMTPHost, 
                    port: organization.PortNumber, 
                    auth: {
                        user: organization.ServerId,
                        pass: organization.Password
                    }
                };
            }
            else
            {            
                transporterOption = {
                    host: organization.SMTPHost, 
                    port: organization.PortNumber, 
                    // We add this setting to tell nodemailer the host isn't secure during dev:
                    ignoreTLS: true
                };          
            }

            const transporter = nodemailer.createTransport(transporterOption);

            if(body == null)
                return;

            if(userEmail == null)
                return;

            // Now when your send an email, it will show up in the MailDev interface
            const message = {
                from: organization.Label + ' ' +  organization.Email,  // Sender address
                to: userEmail ,   // List of recipients
                subject: emailSubject, // Subject line
                html: body,
                attachments: certificateAttachment || null
            };

            transporter.sendMail(message, function(err, info) {
                if (err) {
                    console.log('Error' , err);
                    resolve(false);
                }  
                else  {
                    console.log('Info' , info)
                    resolve(true);
                }             
            }); 
        })
    }
}

async function sendTestEmail(email, user)
{ 
    console.log(' email =>  ' , email)
    if(email)
    {
        return new Promise((resolve,reject)=>{
            let transporterOption = {};

            if(email.Encryption)
            {
                transporterOption = {
                    host: email.SMTPHost, 
                    port: email.PortNumber, 
                    auth: {
                        user: email.ServerId,
                        pass: email.Password
                    }
                };
            } else  {            
                transporterOption = {
                    host: email.SMTPHost, 
                    port: email.PortNumber, 
                    // We add this setting to tell nodemailer the host isn't secure during dev:
                    ignoreTLS: true
                };          
            }

            const transporter = nodemailer.createTransport(transporterOption);
            // Now when your send an email, it will show up in the MailDev interface

            const replacements = { OrgName: email.OrgName , UserName: email.UserName,
                UserLogin: email.UserEmail, UserPass: email.UserPass};
                
            const testBody = '<br/> <b>Hey there! {UserName} </b><br> This is our first message sent with Nodemailer from {OrgName}'
            const body = testBody.replace(/{\w+}/g, placeholder =>
            replacements[placeholder.substring(1, placeholder.length - 1)] || placeholder, );

            const message = {
                from: email.Label + ' ' +  email.Email, 
                to: email.Email , 
                subject: email.Subject || 'Test Email', // Subject line
                html: email.Body || body
            };

            transporter.sendMail(message, function(err, info) {
                if (err) {
                    console.log('Error' , err);
                    resolve(false);
                }  
                else  {
                    console.log('Info' , info)
                    resolve(true);
                }             
            }); 
        })
    }
}

async function htmlToPdfBuffer(body) {
    const html = body;
    var options = { orientation: 'landscape' };
    return new Promise((resolve, reject) => {
      htmlPdf.create(html,options).toBuffer((err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });
  }
