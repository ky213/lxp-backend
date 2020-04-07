const express = require('express');
const router = express.Router();
const announcementService = require('./announcement.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");

// routes
router.get('/getById', authorize(), getById);
router.get('/getAll', authorize(), getAll);
router.get('/getByUser', authorize(), getByUser);
router.get('/getByUserAll', authorize(), getByUserAll);
router.get('/downloadFile/:id', authorize(), downloadFile);

router.post('/', authorize(), create);
router.post('/addFile', authorize(), addFile);
router.post('/markAnnouncementAsRead/:announcementId', authorize(), markAnnouncementAsRead);

router.put('/', authorize(), update);

router.delete('/deleteFile/:id', authorize(), deleteFile);
router.delete('/deleteAnnouncements', authorize(), deleteAnnouncements);

module.exports = router;

async function getAll(req, res, next)  {
  //console.log('getAll', req.query.instituteId);
  announcementService.getAll(req.user, req.query.instituteId)
      .then(data => res.json(data));
}

async function getById(req, res, next)  {
  //console.log('announcementService.getById', req.query.announcementId, req.query.instituteId);
  announcementService.getById(req.user, req.query.announcementId, req.query.instituteId)
      .then(data => res.json(data));
}

async function getByUser(req, res, next)  {
  //console.log('getByUser', req.user);
  announcementService.getByUser(req.user, false, req.query.instituteId)
      .then(data => res.json(data));
}

async function getByUserAll(req, res, next)  {
  //console.log('getByUser', req.user);
  announcementService.getByUser(req.user, true, req.query.instituteId)
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