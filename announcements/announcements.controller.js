const express = require('express');
const router = express.Router();
const announcementService = require('./announcement.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");
const Permissions = require("permissions/permissions")

// routes
router.get('/getById', authorize(Permissions.api.announcements.get), getById);
router.get('/getAll', authorize(Permissions.api.announcements.get), getAll);
router.get('/getByUser', authorize(Permissions.api.announcements.get), getByUser);
router.get('/getByUserAll', authorize(Permissions.api.announcements.get), getByUserAll);
router.get('/downloadFile/:id', authorize(Permissions.api.announcements.get), downloadFile);
router.post('/', authorize(Permissions.api.announcements.create), create);
router.post('/addFile', authorize(Permissions.api.announcements.create), addFile);
router.post('/markAnnouncementAsRead/:announcementId', authorize(Permissions.api.announcements.create), markAnnouncementAsRead);
router.put('/', authorize(Permissions.api.announcements.update), update);
router.delete('/deleteFile/:id', authorize(Permissions.api.announcements.delete), deleteFile);
router.delete('/deleteAnnouncements', authorize(Permissions.api.announcements.delete), deleteAnnouncements);

module.exports = router;

async function getAll(req, res, next)  {
  //console.log('getAll', req.query.organizationId);
  announcementService.getAll(req.user, req.query.organizationId)
      .then(data => res.json(data));
}

async function getById(req, res, next)  {
  //console.log('announcementService.getById', req.query.announcementId, req.query.organizationId);
  announcementService.getById(req.user, req.query.announcementId, req.query.organizationId)
      .then(data => res.json(data));
}

async function getByUser(req, res, next)  {
  //console.log('getByUser', req.user);
  announcementService.getByUser(req.user, false, req.query.organizationId)
      .then(data => res.json(data));
}

async function getByUserAll(req, res, next)  {
  //console.log('getByUser', req.user);
  announcementService.getByUser(req.user, true, req.query.organizationId)
      .then(data => res.json(data));
}

async function create(req, res, next)  {
  console.log('create', req.body);
  announcementService.create(req.user, req.body)
      .then(data => res.json(data));
}

async function update(req, res, next)  {
  console.log('update', req.body);
  announcementService.update(req.user, req.body)
      .then(data => res.json(data));
}

async function addFile(req, res, next)  {
  console.log('addFile', req.body);
  announcementService.addFile(req.user, req.body)
      .then(data => res.json(data));
}

async function deleteFile(req, res, next)  {
  console.log('deleteFile', req.params.id);
  announcementService.deleteFile(req.user, req.params.id)
      .then(data => res.json(data));
}

async function downloadFile(req, res, next)  {
  console.log('downloadFile', req.params.id);
  announcementService.downloadFile(req.user, req.params.id)
      .then(data => {
        res.json({...data, file: converter.ConvertImageBufferToBase64(data.file)})        
      });
}

async function markAnnouncementAsRead(req, res, next)  {
  console.log('markAnnouncementAsRead', req.params.announcementId);
  announcementService.markAnnouncementAsRead(req.user, req.params.announcementId)
    .then(data => res.json(data));
}

async function deleteAnnouncements(req, res, next) {      
  announcementService.deleteAnnouncements(req.user, req.body)
      .then(() => res.json(true))
      .catch(err => next(err));
}
