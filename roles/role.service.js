const config = require('config.json');
const jwt = require('jsonwebtoken');
const PermissionService = require('permissions/permissions.service');
const knex = require('../db');

module.exports = {
    getAll,
    getCmRoles,
    getCmRolesMap,
    create,
    update
};

async function getAll(organizationId) {
  await knex('roles')
      .where('organization_id', organizationId)
      .orWhere('global', true);
}

async function getCmRoles(organizationId) {
    return knex('roles')
        .select('role_id as roleId', 'name', 'permissions')
        .where('organization_id', organizationId)
        .orWhere('global', true);

}

async function getCmRolesMap(organizationId) {
    roles = getCmRoles(organizationId)

    return await roles
        .then(roles=>{
            var rolesMap = new Map;
            for( r of roles){
                rolesMap[r.roleId]=r;
            }
            return rolesMap
        });
}
async function create(loggeduser, newRole, organizationId) {

    newRole.global = false; //global roles should be managed by migrations scripts
    newRole.organiztionId = PermissionService.isSuperAdmin(loggeduser) ? organizationId: loggeduser.orgranization;

    return knex
        .transaction(async function (t) {
            return await knex("roles")
                .transacting(t)
                .insert({
                    role_id: newRole.roleId.trim(),
                    name: newRole.name.trim(),
                    global: newRole.global,
                    organization_id: newRole.organiztionId,
                    permissions: JSON.stringify(newRole.permissions)
                })
                .returning("role_id");

        })
        .catch(err => {
            console.log("err", err);
        });


}

async function update(loggeduser, newRole, organizationId) {

    newRole.global = false; //global roles should be managed by migrations scripts
    newRole.organiztionId = PermissionService.isSuperAdmin(loggeduser) ? organizationId: loggeduser.orgranization;

    return knex
        .transaction(async function (t) {
            await knex("roles")
                .transacting(t)
                .where("role_id", newRole.roleId)
                .update({
                    name: newRole.name.trim(),
                    global: newRole.global,
                    organization_id: newRole.organiztionId,
                    permissions: JSON.stringify(newRole.permissions)
                }).catch(err => {
                    console.log("err", err);
                });

        })
        .catch(err => {
            console.log("err", err);
        });
}
