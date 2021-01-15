const expressJwt = require('express-jwt');
const { secret } = require('config.json');
const knex = require('../db');
const Permissions = require('../permissions/permissions')

module.exports = authorize;

function verifyPermission(userPermissions, expectedPermission) {
    //uncomment below commands to debug permission verification issues
    // console.log('hasPermision', userPermissions[expectedPermission]);
    // console.log('isSuperAdmin', userPermissions[Permissions.api.superadmins.isSuperAdmin]);

    return userPermissions[expectedPermission] || userPermissions[Permissions.api.superadmins.isSuperAdmin];
}

function authorize(expectedPermission = '') {

    return [
        // authenticate JWT token and attach user to request object (req.user)
        expressJwt({ secret }),

        // authorize based on user role
        async (req, res, next) => {

            if (!req.user) {
                return res.status(401).json({message: 'Unauthorized. Missing user session.'});
            }

            const userData = await getUserActiveStatus(req.user.userId) ;
            if(userData && userData.isActive === false) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const authenticated = verifyPermission(req.user.permissions, expectedPermission)
            if (!authenticated) {
                return res.status(403).json({message: 'Access Forbidden.'});
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
