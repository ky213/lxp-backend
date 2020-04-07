const express = require("express");
const router = express.Router();
const userService = require("./user.service");
const fmService = require("./fm.service");
const authorize = require("helpers/authorize");
const Role = require("helpers/role");
const converter = require("helpers/converter");

// routes
router.post("/add", authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), add);
router.post("/addBulk", authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), addBulk);
router.post("/validateBulk", authorize(), validateBulk);

router.get("/filter", authorize(), getAll); // admin only
router.get("/filterActive", authorize(), getAllActive);

router.put("/update", authorize([Role.Admin, Role.SuperAdmin, Role.InstituteManager]), update);

module.exports = router;

const isResident = false;

function getAllActive(req, res, next) {
  return getAllFm(
    req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    isResident,
    false,
    req.query.filterInstituteId
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
  return getAllFm(
    req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    isResident,
    true,
    req.query.filterInstituteId
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

function getAllFm(loggedInUser, pageId, recordsPerPage, filterName, isResident, includeInactive, filterInstituteId)
{
  return userService
    .getAll(
      loggedInUser,
      pageId,
      recordsPerPage,
      filterName,
      isResident,
      includeInactive,
      filterInstituteId
    );
}

function add(req, res, next) {
  fmService
    .add(req.user, req.body.user, req.body.instituteId)
    .then(data => res.json(data))
    .catch(err => next(err));
}

function addBulk(req, res, next) {
    fmService
    .addBulk(req.user, req.body.users, req.body.instituteId)
    .then(() => res.json(true))
    .catch(err => next(err));
}

function update(req, res, next) {
  fmService
    .update(req.user, req.body.user, req.body.instituteId)
    .then((data) => {
        console.log('FM update data', data);
        res.json(data);
        })
    .catch(err => next(err));
}

function validateBulk(req, res, next) {
  fmService
    .validateBulk(req.user, req.body.users, req.body.instituteId)
    .then(data => {
      res.json(data);
    })
    .catch(err => next(err));
}
