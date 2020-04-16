const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");7
const uuid = require("uuid");
var AdmZip = require('adm-zip');
var fs = require('fs');

// routes
router.get('/', authorize(), getAll);
router.get('/getById', authorize(), getById);
router.get('/getAll', authorize(), getAll);
router.get('/getByUser', authorize(), getByUser);
router.get('/getByUserAll', authorize(), getByUserAll);
router.get('/downloadFile/:id', authorize(), downloadFile);

router.put('/', authorize(), update);

router.post('/', authorize(), create);
router.post('/uploadFile', authorize(), uploadFile);

router.delete('/deleteCourses', authorize(), deleteCourses);

module.exports = router;

async function getAll(req, res, next)  {
  courseService.getAll(req.user, req.query.instituteId, req.query.programId, req.query.page, req.query.take)
      .then(data => res.json(data));
}

async function getById(req, res, next)  {
  courseService.getById(req.user, req.query.courseId, req.query.instituteId)
      .then(data => res.json(data));
}

async function getByUser(req, res, next)  {
  courseService.getByUser(req.user, false, req.query.instituteId)
      .then(data => res.json(data));
}

async function getByUserAll(req, res, next)  {
  courseService.getByUser(req.user, true, req.query.instituteId)
      .then(data => res.json(data));
}

async function create(req, res, next)  {  
  let contentPath = `/${uuid()}/`;

  if (req.files && req.files.file)
    uploadFile(req.files.file, contentPath);

    courseService.create(req.user, req.body.selectedInstitute, req.body.programId, 
      req.body.name, req.body.description, req.body.periodDays, req.body.startingDate, req.body.logo, contentPath)
      .then(data => res.json(data))
}

async function update(req, res)  {
  
  if (req.files && req.files.file)
    uploadFile(req.files.file, req.body.contentPath);

  courseService.update(req.user, req.body.selectedInstitute, req.body.courseId, req.body.programId, 
    req.body.name, req.body.description, req.body.periodDays, req.body.startingDate, req.body.logo)
    .then(data => res.json(data))
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

async function deleteCourses(req, res, next)  {
  console.log('deleteCourse', req.body);
  courseService.deleteCourses(req.user, req.body.courseIds, req.body.selectedInstituteId)
      .then(data => res.json(data));
}

async function uploadFile(file, contentPath)  {
  // console.log('uploadFile', req.files);
  // const file = req.files.file;
  const dir = `./upload${contentPath}`;
  var uploadPath = `${dir}tincan.zip`

  // deleteFolderContent(dir);
  fs.mkdirSync(dir, { recursive: true });

  file.mv(uploadPath, (error) => {
    if (error) {
      console.error(error)
      res.writeHead(500, {
        'Content-Type': 'application/json'
      })
      // res.end(JSON.stringify({ status: 'error', message: error }))

      return { status: 'error', message: error };
    }

    var zip = new AdmZip(uploadPath);
    zip.extractAllTo( dir, true);
    // res.writeHead(200, {
    //   'Content-Type': 'application/json'
    // })
    // res.end(JSON.stringify({ status: 'success', path: dir }))
    return { status: 'success' };
  })
}

function deleteFolderContent (folderPath) {
  const path = require('path');

  fs.readdir(folderPath, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(folderPath, file), err => {
        if (err) throw err;
      });
    }
  });
}
