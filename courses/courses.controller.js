const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");
var zlib = require('zlib');
var fs = require('fs');
var unzipper = require('unzipper');



// routes
router.get('/:id', authorize(), getById);
router.get('/', authorize(), getAll);

router.get('/downloadFile/:id', authorize(), downloadFile);


router.put('/', authorize(), update);

router.delete('/deleteCourses', authorize(), deleteCourse);
router.get('/getById', authorize(), getById);
router.get('/getAll', authorize(), getAll);
router.get('/getByUser', authorize(), getByUser);
router.get('/getByUserAll', authorize(), getByUserAll);

router.post('/', authorize(), create);
router.post('/uploadFile', authorize(), uploadFile);

router.put('/', authorize(), update);

router.delete('/:id', authorize(), deleteCourse);



module.exports = router;

async function getAll(req, res, next)  {
  //console.log('getAll', req.query.instituteId);
  courseService.getAll(req.user, req.query.instituteId, req.query.programId, req.query.page, req.query.take)
      .then(data => res.json(data));
}

async function getById(req, res, next)  {
  //console.log('announcementService.getById', req.query.announcementId, req.query.instituteId);
  courseService.getById(req.user, req.query.announcementId, req.query.instituteId)
      .then(data => res.json(data));
}

async function getByUser(req, res, next)  {
  //console.log('getByUser', req.user);
  courseService.getByUser(req.user, false, req.query.instituteId)
      .then(data => res.json(data));
}

async function getByUserAll(req, res, next)  {
  //console.log('getByUser', req.user);
  courseService.getByUser(req.user, true, req.query.instituteId)
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

async function deleteCourse(req, res, next)  {
  console.log('deleteCourse', req.params.id);
  courseService.deleteCourse(req.user, req.params.id)
      .then(data => res.json(data));
}

async function uploadFile(req, res, next)  {
  console.log('uploadFile', req.body);

  var block = req.body.content.split(";");
  var contentType = block[0].split(":")[1];
  var realData = block[1].split(",")[1];

  const imgBuffer = Buffer.from(realData)

  console.log('realData', realData);
  
  var Readable = require('stream').Readable

  var s = new Readable()

  s.push(imgBuffer)   
  s.push(null)

  s.pipe(fs.createWriteStream("test.zip"));

  // fs.createReadStream(req.body.content)
  //   .pipe(unzipper.Extract({ path: './' }));
}
