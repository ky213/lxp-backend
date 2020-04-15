const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");
var AdmZip = require('adm-zip');

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
  courseService.getById(req.user, req.query.courseId, req.query.instituteId)
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
  console.log('body', req.body);
  uploadFile(req.body.courseData.fileData, req.body.courseData.programId).then(contentPath => 
    courseService.create(req.user, {...req.body.courseData, contentPath}, req.body.selectedInstitute)
      .then(data => res.json(data))
  );  
}

async function update(req, res, next)  {
  console.log('body', req.body);
  uploadFile(req.body.courseData.fileData, req.body.courseData.programId).then(contentPath =>
    courseService.update(req.user, {...req.body.courseData, contentPath}, req.body.selectedInstitute)
      .then(data => res.json(data))
  );  
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

async function uploadFile(fileData, programId)  {
  
  var data_url = fileData;
  var matches = data_url.match(/^data:.+\/(.+);base64,(.*)$/);
  // var ext = matches[1];
  var base64_data = matches[2];
  var buffer = Buffer.from(base64_data, 'base64');

  var zip = new AdmZip(buffer);
  var path = `./courses-data/${programId}`
  zip.extractAllTo(/*target path*/ path, /*overwrite*/true);
  
  return path;
}

function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary);
      this.push(null);
    }
  });

  return readableInstanceStream;
}
