const expressJwt = require('express-jwt');
const { secret } = require('config.json');
const Role = require('helpers/role');
const knex = require('../db'); 

module.exports = authorize;

function authorize(roles = []) {
    // roles param can be a single role string (e.g. Role.User or 'User') 
    // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // authenticate JWT token and attach user to request object (req.user)
        expressJwt({ secret }),

        // authorize based on user role
        async (req, res, next) => {
   
            const userData = await getUserActiveStatus(req.user.userId) ;

            if(req.user && req.user.role != Role.SuperAdmin) {
                if (roles.length && !roles.includes(req.user.role)) {
                    // user's role is not authorized
                    return res.status(401).json({ message: 'Unauthorized' });
                }
                else if(userData && userData.isActive == false) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }
            }

            next();
        }
    ];
}

async function getUserActiveStatus(userId)
{
    return await knex('users')
        .where('users.user_id', userId)
        .select([ 'user_id as userId', 'is_active as isActive'  ] )
        .first();   
}