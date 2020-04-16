const express = require('express');
const router = express.Router();
const courseService = require('./course.service');
const authorize = require('helpers/authorize');
const converter = require("helpers/converter");
var AdmZip = require('adm-zip');
var fs = require('fs');

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

async function uploadFile(req, res)  {
  const file = req.files.file;
  //console.log("Request:", req.body, req.files.file)
  const dir = `./upload/${req.body.programId}/${file.md5}/`;
  var uploadPath = `${dir}tincan.zip`

  fs.mkdirSync(dir, { recursive: true });


  file.mv(uploadPath, (error) => {
    if (error) {
      console.error(error)
      res.writeHead(500, {
        'Content-Type': 'application/json'
      })
      res.end(JSON.stringify({ status: 'error', message: error }))
      return;
    }

    var zip = new AdmZip(uploadPath);
    //var uploadPath = `./upload/${programId}/`
  
    //deleteFolderContent(uploadPath);
  
    zip.extractAllTo(dir, true);

    /*
    fs.unlink(uploadPath, function (err) {
      if (err) throw err;
      // if no error, file has been deleted successfully
      console.log('File deleted!');
    }); 
    */
    res.writeHead(200, {
      'Content-Type': 'application/json'
    })
    res.end(JSON.stringify({ status: 'success', path: dir }))
  })


}

function deleteFolderContent (folderPath) {
  const fs = require('fs');
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
