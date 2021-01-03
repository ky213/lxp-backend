const express = require("express");
const router = express.Router();
const userService = require("./user.service");
const learnerService = require("./learner.service");
const authorize = require("helpers/authorize");
const Role = require("helpers/role");
const converter = require("helpers/converter");

// routes
router.get("/filterActive", authorize(), getAllActive);
router.get("/filter", authorize([]), getAll);
    
router.post("/add", authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector]), add);
router.post("/addBulk", authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector]), addBulk);
router.post("/validateBulk", authorize(), validateBulk);

router.put("/update", authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector]), update);


module.exports = router;

const isLearner = true;

function getAllActive(req, res, next) {
  return getAllLearners(req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    req.query.filterEmail,
    null,
    false,
    req.query.filterOrganizationId,
    req.query.filterProgramId
  )
  .then(data => {
    let users = data.users.map(user => ({
      ...user,
      profilePhoto: converter.ConvertImageBufferToBase64(user.profilePhoto)
    }));

    return res.json({
      users,
      totalNumberOfRecords: parseInt(data.totalNumberOfRecords[0]["count"])
    });
  })
  .catch(error => console.log("Error getAll:", error));
}

function getAll(req, res, next)
{
  console.log('get All', req.user);
  return getAllLearners(req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    req.query.filterEmail,
    isLearner,
    true,
    req.query.filterOrganizationId,
    req.query.filterProgramId
  )
  .then(data => {
    let users = data.users.map(user => ({
      ...user,
      profilePhoto: converter.ConvertImageBufferToBase64(user.profilePhoto)
    }));

    return res.json({
      users,
      totalNumberOfRecords: parseInt(data.totalNumberOfRecords)
    });
  })
  .catch(error => console.log("Error getAll:", error));
}

function getAllLearners(loggedInUser, pageId, recordsPerPage, filterName,filterEmail, isLearner, includeInactive, filterOrganizationId, filterProgramId)
{
  return userService
    .getAll(
      loggedInUser,
      pageId,
      recordsPerPage,
      filterName,
      filterEmail,
      isLearner,
      includeInactive,
      filterOrganizationId,
      filterProgramId
    );
}

function add(req, res, next) {
  learnerService
    .add(req.user, req.body.user, req.body.organizationId)
    .then(data => { 
      learnerService.sendEmailForCourse(req.user, data.courses, data.userId , req.body.organizationId , true);
      res.json(data)
    })
    .catch(err => next(err));
}

function addBulk(req, res, next) {
  learnerService
    .addBulk(req.user, req.body.users, req.body.existUsers, req.body.organizationId)
    .then(() => res.json(true))
    .catch(err => next(err));
}

function update(req, res, next) {
  learnerService
    .update(req.user, req.body.user, req.body.organizationId)
    .then(d => {
      learnerService.updateUserCourse( d.courses, d.userId)
      .then(data => { 
        if(data)  {
          learnerService.sendEmailForCourse(req.user, data.courses, data.userId , req.body.organizationId , d.isActive);
          res.json({...data , isActive: d.isActive , user : d.user })
        }
      })
      .catch(err => {
          console.log("errror", err);
      });
    })
    .catch(err => {
      console.log("errror", err);
    });
}

function validateBulk(req, res, next) {
  console.log('validateBulk', req.body);
  learnerService
    .validateBulk(req.user, req.body.users, req.body.organizationId)
    .then(data => {
      res.json(data);
    })
    .catch(err => next(err));
}

