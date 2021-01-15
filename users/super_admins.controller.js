const express = require('express');
const router = express.Router();
const superAdminService = require('./super_admin.service');
const authorize = require('helpers/authorize')

const converter = require('helpers/converter');
const Permissions = require("permissions/permissions")

// routes
router.get('/', authorize(Permissions.api.superadmins.get), getAll);
router.get('/getByUserId', authorize(Permissions.api.superadmins.get), getByUserId);
router.post('/', authorize(Permissions.api.superadmins.create), add);
router.put('/', authorize(Permissions.api.superadmins.update), update);

module.exports = router;

function getAll(req, res, next) {
  superAdminService.getAll(req.user)
      .then(data => {
        let users = data.map(user => ({
          ...user,
          profilePhoto: converter.ConvertImageBufferToBase64(user.profilePhoto)
        }));
    
        return res.json(users);
      })
      .catch((error) => console.log('Error getAll:', error));
}

function getByUserId(req, res, next) {
  superAdminService.getByUserId(req.user, req.query.userId)
      .then(user => {
        let _user = user ? ({
          ...user,
          profilePhoto: converter.ConvertImageBufferToBase64(user.profilePhoto)
          })
          : user;

        return res.json(_user);
      })
      .catch((error) => console.log('Error getAll:', error));
}

function update(req, res, next) {
  superAdminService.update(req.user, req.body.userId, req.body.name, req.body.surname, req.body.email, req.body.isActive, req.body.groupId)
  .then(data => res.json(data))
  .catch(err => next(err));
}

function add(req, res, next) {
  superAdminService.add(req.user, req.body.name, req.body.surname, req.body.email, req.body.groupId)
    .then(data => res.json(data))
    .catch(err => {
      console.log('error', err);
      next(err)});
}
