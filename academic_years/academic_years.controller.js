const express = require("express");
const router = express.Router();
const academicYearService = require("./academic_year.service");
const authorize = require("helpers/authorize");
const Role = require("helpers/role");

// routes
router.get("/", authorize(), getByLoggedInUser);
router.get("/getById", authorize(), getById);
router.get("/getByProgramId", authorize(), getByProgramId);

router.post("/", authorize(), create);

router.put("/", authorize(), update);

router.delete("/", authorize(), deleteAcademicYear);
router.delete('/deleteAcademicYears', authorize(), deleteAcademicYears);

module.exports = router;

function getByLoggedInUser(req, res, next) {
  academicYearService
    .getByLoggedInUser(req.user, req.query.filterInstituteId)
    .then(data =>
      data ? res.json(data) : res.status(404).json({ message: "Not found" })
    )
    .catch(err => next(err));
}

function getById(req, res, next) {
  academicYearService
    .getById(req.user, req.query.academicYearId, req.query.instituteId)
    .then(data =>
      data ? res.json(data) : res.status(404).json({ message: "Not found" })
    )
    .catch(err => next(err));
}

function getByProgramId(req, res, next) {
  console.log('getByProgramId =>', req.query.programId, req.query.instituteId);
  academicYearService
    .getByProgramId(req.user, req.query.programId, req.query.instituteId)
    .then(data =>
      data ? res.json(data) : res.status(404).json({ message: "Not found" })
    )
    .catch(err => next(err));
}
getByProgramId

async function create(req, res, next) {
  console.log("create", req.body);
  academicYearService.create(req.user, req.body.academicYear, req.body.instituteId).then(data => res.json(data));
}

async function update(req, res, next) {
  console.log("update ay", req.body);
  academicYearService.update(req.user, req.body.academicYear, req.body.instituteId).then(data => res.json(data));
}

async function deleteAcademicYear(req, res, next) {
  console.log('deleteAcademicYear', req.query);
  academicYearService
    .deleteAcademicYear(req.user, req.query.instituteId, req.query.academicYearId)
    .then(data => res.json(data))
    .catch(err => console.log('err', err));
}

async function deleteAcademicYears(req, res, next) {
  console.log('deleteAcademicYears', req.query);
  academicYearService
    .deleteAcademicYears(req.user, req.body.instituteId, req.body.academicYears)
    .then(data => res.json(data))
    .catch(err => console.log('err', err));
}
