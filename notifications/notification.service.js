const knex = require('../db'); 
const moment = require('moment');

require('moment-timezone');

module.exports = {
    getAll,
    getAllUnread,
    getUnreadCount,
    getById,
    create,
    setRead,
};


async function getAll(user, page, take, filter, selectedOrganizationId) {
    let offset = ((page || 1) - 1) * (take || 15);

    let model = knex.table('notifications')
    .join('notification_types', 'notification_types.notification_type_id', 'notifications.notification_type_id')
    .join('users', 'users.user_id', 'notifications.user_id')
    .where('notifications.user_id', user.sub);

    if (filter && filter != null) {
        model.andWhere(function() {
            this.where('notifications.text', 'like', '%' + filter + '%')
        });
    }

    var totalNumberOfRecords = await model.clone().count();
    if (totalNumberOfRecords[0].count <= offset) {
        offset = 0;
    }

    const notifications = await model.clone()
    .select([
        'notifications.notification_id as notificationId', 
        'notifications.user_id as userId', 
        'notifications.generated',
        'notifications.text',             
        'notifications.is_read as isRead',
        'notifications.notification_type_id as notificationTypeId',
        'notification_types.type as notificationType',
        'notification_types.name as notificationTypeName',
    ])
    .orderBy('generated', 'desc')
    .offset(offset)
    .limit(take);

    return {
        notifications,
        totalNumberOfRecords: totalNumberOfRecords[0].count
    }
}

async function getAllUnread(user, limit, selectedOrganizationId) {
    let model = knex.select([
        'notifications.notification_id as notificationId', 
        'notifications.user_id as userId', 
        'notifications.generated',
        'notifications.text',             
        'notifications.is_read as isRead',
        'notifications.notification_type_id as notificationTypeId',
        'notification_types.type as notificationType',
        'notification_types.name as notificationTypeName',
    ])
    .from('notifications')
    .join('users', 'users.user_id', 'notifications.user_id')
    .join('notification_types', 'notification_types.notification_type_id', 'notifications.notification_type_id')
    .where('notifications.user_id', user.sub)
    .andWhere('notifications.is_read', false)
    .orderBy('notifications.generated', 'desc');

    if(limit) {
        model.limit(limit);
    }

    let totalUnreadCount = await getUnreadCount(user, selectedOrganizationId);

    return  {unreadNotifications: await model || [], totalUnreadCount: totalUnreadCount && totalUnreadCount.length > 0 && totalUnreadCount[0].count || 0 };
}

async function getUnreadCount(user, selectedOrganizationId) {
    return await knex.select()
    .from('notifications')
    .join('users', 'users.user_id', 'notifications.user_id')
    .where('notifications.user_id', user.sub)
    .andWhere('notifications.is_read', false).count();
}

async function getById(notificationId, user, selectedOrganizationId) {
    return await knex.select([
        'notifications.notification_id as notificationId', 
        'notifications.user_id as userId', 
        'notifications.generated',
        'notifications.text',             
        'notifications.is_read as isRead',
        'notifications.notification_type_id as notificationTypeId',
        'notification_types.type as notificationType',
        'notification_types.name as notificationTypeName'
    ])
    .from('notifications')
    .join('users', 'users.user_id', 'notifications.user_id')
    .where('notifications.user_id', user.sub)
    .andWhere('notifications.notification_id', notificationId)
    .limit(1)
    .first();
}


async function create({notification, userId, employeeId, transaction}) {
    const trx = transaction || await knex.transaction();

    try {
        let notificationUserId = userId;
        if(employeeId) {
            const employeeUser = await knex.select(['user_id']).from('employees').where('employee_id', employeeId).limit(1).first();
            if(employeeUser) {
                notificationUserId = employeeUser.user_id;
            }
        }

        const newNotification = await trx('notifications')
            .insert({
                user_id: notificationUserId, 
                text: notification.text,
                notification_type_id: notification.notificationTypeId || 1,
                reference: notification.reference || null
            }).returning('notification_id');
        
        await trx('notification_channels')
            .insert({
                notification_id: newNotification[0],
                notification_channel_type_id: 1
            });
    }
    catch(err) {
        console.log('Create notification error:', err)
        throw err
    }
}

async function setRead(notification, user)
{
    console.log("Set read: ", notification)
    await knex('notifications')
        .where('notifications.notification_id', notification.notificationId)
        .where('notifications.user_id', user.sub)

        .update({
            is_read: notification.isRead
        });  
}

