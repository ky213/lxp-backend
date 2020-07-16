const express = require("express");
const router = express.Router();
const userService = require("./user.service");
const residentService = require("./resident.service");
const authorize = require("helpers/authorize");
const Role = require("helpers/role");
const converter = require("helpers/converter");

// routes
router.get("/filterActive", authorize(), getAllActive);
router.get("/filter", authorize([]), getAll);
    
router.post("/add", authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), add);
router.post("/addBulk", authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), addBulk);
router.post("/validateBulk", authorize(), validateBulk);

router.put("/update", authorize([Role.Admin, Role.SuperAdmin, Role.OrganizationManager, Role.ProgramDirector]), update);

module.exports = router;

const isResident = true;

function getAllActive(req, res, next) {
  return getAllResidents(req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    isResident,
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
  return getAllResidents(req.user,
    req.query.pageId,
    req.query.recordsPerPage,
    req.query.filterName,
    isResident,
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
      totalNumberOfRecords: parseInt(data.totalNumberOfRecords[0]["count"])
    });
  })
  .catch(error => console.log("Error getAll:", error));
}

function getAllResidents(loggedInUser, pageId, recordsPerPage, filterName, isResident, includeInactive, filterOrganizationId, filterProgramId)
{
  return userService
    .getAll(
      loggedInUser,
      pageId,
      recordsPerPage,
      filterName,
      isResident,
      includeInactive,
      filterOrganizationId,
      filterProgramId
    );
}

function add(req, res, next) {
  residentService
    .add(req.user, req.body.user, req.body.organizationId)
    .then(data => res.json(data))
    .catch(err => next(err));
}

function addBulk(req, res, next) {
  residentService
    .addBulk(req.user, req.body.users, req.body.organizationId)
    .then(() => res.json(true))
    .catch(err => next(err));
}

function update(req, res, next) {
  residentService
    .update(req.user, req.body.user, req.body.organizationId)
    .then(data => res.json(data))
    .catch(err => {
      console.log("errror", err);
    });
}

function validateBulk(req, res, next) {
  console.log('validateBulk', req.body);
  residentService
    .validateBulk(req.user, req.body.users, req.body.organizationId)
    .then(data => {
      res.json(data);
    })
    .catch(err => next(err));
}
