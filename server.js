﻿require('rootpath')();

const express = require('express');
const cookieParser = require('cookie-parser'); 
const app = express();
app.use(cookieParser());

const cors = require('cors');
const bodyParser = require('body-parser');
const errorHandler = require('helpers/error-handler');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '250mb'}));

//app.use(cors());
app.use(cors({origin: process.env.FRONTEND_URL || 'http://localhost:4101', credentials: true}));
app.use('/api/static', express.static('upload'));
// api routes
// because of hosting and nginx there has to be prefix api in all the routes
app.use('/api/users', require('./users/users.controller'));
app.use('/api/residents', require('./users/residents.controller'));
app.use('/api/fm', require('./users/fm.controller'));
app.use('/api/superadmins', require('./users/super_admins.controller'));
app.use('/api/roles', require('./roles/roles.controller'));
app.use('/api/user_roles', require('./roles/employee_roles.controller'));
app.use('/api/institutes', require('./institutes/institutes.controller'));
app.use('/api/programs', require('./programs/programs.controller'));
app.use('/api/academic_years', require('./academic_years/academic_years.controller'));
app.use('/api/calendar', require('./calendar/calendar.controller'));
app.use('/api/activities', require('./activities/activities.controller'));
app.use('/api/activity_type', require('./activity_type/activity_type.controller'));
app.use('/api/exp-levels', require('./experience_levels/experience_levels.controller'));
app.use('/api/announcements', require('./announcements/announcements.controller'));
app.use('/api/courses', require('./courses/courses.controller'));
app.use('/api/notifications', require('./notifications/notifications.controller'));
app.use('/xapi/statements', require('./xapi/statements.controller'));
app.use('/xapi/activities/state', require('./xapi/state.controller'));
app.use('/api/courses', require('./courses/courses.controller'));


// global error handler
app.use(errorHandler);

// start server
const port = 4001;
const server = app.listen(port, function () {
    console.log(process.env.NODE_ENV);
    console.log('Server listening on port ' + port);
});