require('rootpath')();

const express = require('express');
const fileupload = require('express-fileupload')
const cookieParser = require('cookie-parser'); 
const app = express();
app.use(cookieParser());

const cors = require('cors');
const bodyParser = require('body-parser');
const errorHandler = require('helpers/error-handler');

const getRawBody = require('raw-body');
app.use(function (req, res, next) {
    if (req.headers['content-type'] === 'application/octet-stream') {
        getRawBody(req, {
            length: req.headers['content-length'],
            encoding: req.charset
        }, function (err, string) {
            if (err)
                return next(err);

            req.body = string;
            next();
         })
    }
    else {
        next();
    }
});

app.use(fileupload());
app.use(express.urlencoded());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit: '250mb'}));

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200, // For legacy browser support
    methods: "POST"
}

app.use(cors(corsOptions));
app.options('*', cors()) // include before other routes
//app.use(cors({origin: process.env.FRONTEND_URL || 'http://localhost:4101', credentials: true}));
app.use('/api/static', express.static('upload'));
// api routes
// because of hosting and nginx there has to be prefix api in all the routes
app.use('/api/users', require('./users/users.controller'));
app.use('/api/learners', require('./users/learners.controller'));
app.use('/api/cm', require('./users/course_manager.controller'));
app.use('/api/superadmins', require('./users/super_admins.controller'));
app.use('/api/roles', require('./roles/roles.controller'));
app.use('/api/user_roles', require('./roles/employee_roles.controller'));
app.use('/api/organizations', require('./organizations/organizations.controller'));
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
app.use('/api/group_type', require('./group_type/group_type.controller'));
app.use('/api/groups', require('./groups/groups.controller'));
app.use('/api/dashboards', require('./dashboard/dashboard.controller'));

// global error handler
app.use(errorHandler);

// start server
const port = process.env.PORT||4001;
const server = app.listen(port, function () {
    console.log(process.env.NODE_ENV);
    console.log('Server listening on port ' + port);
});

server.timeout = 600000;
