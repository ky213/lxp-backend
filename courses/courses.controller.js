const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");

// routes
router.get('/:id', authorize(), getById);
router.get('/', authorize(), getAll);

router.get('/downloadFile/:id', authorize(), downloadFile);

router.post('/addFile', authorize(), addFile);


router.put('/', authorize(), update);

router.delete('/deleteFile/:id', authorize(), deleteFile);
router.delete('/deleteCourses', authorize(), deleteCourses);

module.exports = router;

async function getAll(req, res, next)  {
  //console.log('getAll', req.query.instituteId);
  courseService.getAll(req.user, req.query.instituteId, req.query.programId, req.query.page, req.query.take)
      .then(data => res.json(data));
}

async function getById(req, res, next)  {
  //console.log('announcementService.getById', req.query.announcementId, req.query.instituteId);
  courseService.getById(req.user, req.param.id, req.query.instituteId)
      .then(data => res.json(data));
}




async function create(req, res, next)  {
  console.log('create', req.body);
  courseService.create(req.user, req.body)
      .then(data => res.json(data));
}

async function update(req, res, next)  {
  console.log('update', req.body);
  courseService.update(req.user, req.body)
      .then(data => res.json(data));
}

async function addFile(req, res, next)  {
  console.log('addFile', req.body);
  courseService.addFile(req.user, req.body)
      .then(data => res.json(data));
}

async function deleteFile(req, res, next)  {
  console.log('deleteFile', req.params.id);
  courseService.deleteFile(req.user, req.params.id)
      .then(data => res.json(data));
}

async function downloadFile(req, res, next)  {
  console.log('downloadFile', req.params.id);
  courseService.downloadFile(req.user, req.params.id)
      .then(data => {
        res.json({...data, file: converter.ConvertImageBufferToBase64(data.file)})        
      });
}

async function deleteCourses(req, res, next) {      
  courseService.deleteAnnouncements(req.user, req.body)
      .then(() => res.json(true))
      .catch(err => next(err));
}