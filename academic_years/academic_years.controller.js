const express = require("express");
const router = express.Router();
const academicYearService = require("./academic_year.service");
const authorize = require("helpers/authorize");

const Permissions = require("permissions/permissions")

// routes
router.get("/", authorize(Permissions.api.academicYears.get.useraccess), getByLoggedInUser);
router.get("/getById", authorize(Permissions.api.academicYears.get.useraccess), getById);
router.get("/getByProgramId", authorize(Permissions.api.academicYears.get.useraccess), getByProgramId);
router.post("/", authorize(Permissions.api.academicYears.create), create);
router.put("/", authorize(Permissions.api.academicYears.update), update);
router.delete("/", authorize(Permissions.api.academicYears.delete), deleteAcademicYear);
router.delete('/deleteAcademicYears', authorize(Permissions.api.academicYears.delete), deleteAcademicYears);

module.exports = router;

function getByLoggedInUser(req, res, next) {
  academicYearService
    .getByLoggedInUser(req.user, req.query.filterOrganizationId)
    .then(data =>
      data ? res.json(data) : res.status(404).json({ message: "Not found" })
    )
    .catch(err => next(err));
}

function getById(req, res, next) {
  academicYearService
    .getById(req.user, req.query.academicYearId, req.query.organizationId)
    .then(data =>
      data ? res.json(data) : res.status(404).json({ message: "Not found" })
    )
    .catch(err => next(err));
}

function getByProgramId(req, res, next) {
  console.log('getByProgramId =>', req.query.programId, req.query.organizationId);
  academicYearService
    .getByProgramId(req.user, req.query.programId, req.query.organizationId)
    .then(data =>
      data ? res.json(data) : res.status(404).json({ message: "Not found" })
    )
    .catch(err => next(err));
}
getByProgramId

async function create(req, res, next) {
  console.log("create", req.body);
  academicYearService.create(req.user, req.body.academicYear, req.body.organizationId).then(data => res.json(data));
}

async function update(req, res, next) {
  console.log("update ay", req.body);
  academicYearService.update(req.user, req.body.academicYear, req.body.organizationId).then(data => res.json(data));
}

async function deleteAcademicYear(req, res, next) {
  console.log('deleteAcademicYear', req.query);
  academicYearService
    .deleteAcademicYear(req.user, req.query.organizationId, req.query.academicYearId)
    .then(data => res.json(data))
    .catch(err => console.log('err', err));
}

async function deleteAcademicYears(req, res, next) {
  console.log('deleteAcademicYears', req.query);
  academicYearService
    .deleteAcademicYears(req.user, req.body.organizationId, req.body.academicYears)
    .then(data => res.json(data))
    .catch(err => console.log('err', err));
}
