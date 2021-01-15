const express = require("express");
const router = express.Router();
const userService = require("./user.service");
const cmService = require("./course_manager.service");
const authorize = require("helpers/authorize");

const converter = require("helpers/converter");
const Permissions = require("permissions/permissions")

// routes
router.post("/add", authorize(Permissions.api.courseManagers.create), add);
router.post("/addBulk", authorize(Permissions.api.courseManagers.bulk.create), addBulk);
router.post("/validateBulk", authorize(Permissions.api.courseManagers.bulk.validate), validateBulk);
router.get("/filter", authorize(Permissions.api.courseManagers.get.adminaccess), getAll); // admin only
router.get("/filterActive", authorize(Permissions.api.courseManagers.get.useraccess), getAllActive);
router.put("/update", authorize(Permissions.api.courseManagers.update), update);

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
      totalNumberOfRecords: parseInt(data.totalNumberOfRecords)
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
      null,
      isLearner,
      includeInactive,
      filterOrganizationId
    );
}

function add(req, res, next) {
  cmService
    .add(req.user, req.body.user, req.body.organizationId)
    .then(data => res.json(data))
    .catch(err =>next(err));
}

function addBulk(req, res, next) {
  cmService
    .addBulk(req.user, req.body.users, req.body.organizationId)
    .then(() => res.json(true))
    .catch(err =>next(err));
}

function update(req, res, next) {
  cmService
    .update(req.user, req.body.user, req.body.organizationId)
    .then((data) => {
        console.log('CM update data', data);
        res.json(data);
      })
    .catch(err =>next(err));

}

function validateBulk(req, res, next) {
  cmService
    .validateBulk(req.user, req.body.users, req.body.organizationId)
    .then(data => {
      res.json(data);
    })
    .catch(err =>next(err));
}
