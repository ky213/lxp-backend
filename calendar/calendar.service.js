const knex = require('../db'); 
const userService = require('../users/user.service');

module.exports = {
    getAll,
    getById,
    create,
    update,
    updateStatus
};

async function getAll(user) {
    console.log("Entered get events")
    return knex.select([
            'calendar_event_id as eventId', 
            'employee_id as employeeId', 
            'title',
            'start',             
            'end', 
            'allDay',
            'description',
            'calendar_event_statuses.status',
            'references_employee_id as referencesEmployeeId',
        ])
        .from('calendar_events')
        .join('calendar_event_statuses', 'calendar_event_statuses.calendar_event_status_id', 'calendar_events.status_id')
        .where('employee_id', user.employeeId)
        .orWhere('references_employee_id', user.employeeId)
        .orderBy('created_at', 'desc')
        .then(function(events){
            return events;
        });
}

async function getById(eventId, user) {
    const eventDetails = await knex.select([
        'calendar_event_id as eventId', 
        'employee_id as employeeId', 
        'title',
        'start',             
        'end', 
        'allDay',
        'description',
        'calendar_event_statuses.status',
        'references_employee_id as referencesEmployeeId',
    ])
    .from('calendar_events')
        .join('calendar_event_statuses', 'calendar_event_statuses.calendar_event_status_id', 'calendar_events.status_id')
        .where('calendar_event_id', eventId)
        .where('employee_id', user.employeeId)
        .orWhere('references_employee_id', user.employeeId)
        .limit(1)
        .first();

    const referencedEmployee = await userService.getByEmployeeId(eventDetails.referencesEmployeeId);
    console.log("Referenced employee:", referencedEmployee)
    eventDetails.referencedEmployee = referencedEmployee;
    return eventDetails;
}

async function create(event, user)
{
    console.log("Došao do create calendar events")
    const eventStatus = event.referencesEmployeeId ? await knex('calendar_event_statuses')
        .where('status', 'Requested')
        .select('calendar_event_status_id')
        .first() : await knex('calendar_event_statuses')
        .where('status', 'Accepted')
        .select('calendar_event_status_id')
        .first();

    return knex('calendar_events')
            .insert({
                status_id: eventStatus.calendar_event_status_id,
                employee_id: event.employeeId,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: event.allDay || false,
                description: event.description,
                references_employee_id: event.referencesEmployeeId,
                created_by: user.sub,
                modified_by: user.sub
            });
}

async function update(event, user)
{
    console.log("Got update event:", user)

    return knex('calendar_events')
            .where('calendar_event_id', event.eventId)
            .update({
                status_id: event.statusId,
                employee_id: event.employeeId,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: event.allDay,
                description: event.description,
                references_employee_id: event.referencesEmployeeId,
                modified_at: knex.fn.now(),
                modified_by: user.sub
            });
}

async function updateStatus(eventId, status, user)
{
    const eventStatus = await knex('calendar_event_statuses')
        .where('status', status.status)
        .select('calendar_event_status_id')
        .first();

    return knex('calendar_events')
            .where('calendar_event_id', eventId)
            .update({
                status_id: eventStatus.calendar_event_status_id,
                modified_at: knex.fn.now(),
                modified_by: user.sub
            });
}