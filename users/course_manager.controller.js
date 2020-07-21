const express = require("express");
const router = express.Router();
const userService = require("./user.service");
const cmService = require("./course_manager.service");
const authorize = require("helpers/authorize");
const Role = require("helpers/role");
const converter = require("helpers/converter");

// routes
router.post("/add", authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), add);
router.post("/addBulk", authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), addBulk);
router.post("/validateBulk", authorize(), validateBulk);

router.get("/filter", authorize(), getAll); // admin only
router.get("/filterActive", authorize(), getAllActive);

router.put("/update", authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager]), update);

module.exports = router;

const isLearner = false;

function getAllActive(req, res, next) {
  return getAllCm(
    req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    isLearner,
    false,
    req.query.filterOrganizationId
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

function getAll(req, res, next) {
  return getAllCm(
    req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    isLearner,
    true,
    req.query.filterOrganizationId
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

function getAllCm(loggedInUser, pageId, recordsPerPage, filterName, isLearner, includeInactive, filterOrganizationId)
{
  return userService
    .getAll(
      loggedInUser,
      pageId,
      recordsPerPage,
      filterName,
      isLearner,
      includeInactive,
      filterOrganizationId
    );
}

function add(req, res, next) {
  cmService
    .add(req.user, req.body.user, req.body.organizationId)
    .then(data => res.json(data))
    .catch(err => next(err));
}

function addBulk(req, res, next) {
  cmService
    .addBulk(req.user, req.body.users, req.body.organizationId)
    .then(() => res.json(true))
    .catch(err => next(err));
}

function update(req, res, next) {
  cmService
    .update(req.user, req.body.user, req.body.organizationId)
    .then((data) => {
        console.log('CM update data', data);
        res.json(data);
        })
    .catch(err => next(err));
}

function validateBulk(req, res, next) {
  cmService
    .validateBulk(req.user, req.body.users, req.body.organizationId)
    .then(data => {
      res.json(data);
    })
    .catch(err => next(err));
}
