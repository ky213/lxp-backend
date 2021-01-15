const permissions = require('permissions/permissions')

function hasPermission(loggedUser, expectedPermission ) {
    return loggedUser.permissions[expectedPermission];
}

function isSuperAdmin(loggedUser ) {
    return loggedUser.permissions[permissions.api.superadmins.isSuperAdmin];
}
module.exports = {
    hasPermission,
    isSuperAdmin
}

