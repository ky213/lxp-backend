﻿const express = require("express");
const router = express.Router();
const userService = require("./user.service");
const authorize = require("helpers/authorize");
const converter = require("helpers/converter");
const Role = require("helpers/role");

router.get("/getAllActive", authorize(), getAllActiveUsers);
router.get("/getByEmployeeId/:id", authorize(), getByEmployeeId);
router.get("/getByUserId/:id", authorize(), getByUserId);
router.post("/authenticate", authenticate); // public route
router.put("/change-password", authorize(), changePassword);
router.put("/updateProfilePhoto", authorize(), updateProfilePhoto);
router.put("/updateProfileData", authorize(), updateProfileData);
router.delete("/deleteEmployees", authorize(), deleteEmployees);
router.put("/updateBulk", authorize([Role.Admin, Role.SuperAdmin, Role.LearningManager, Role.ProgramDirector]), updateBulk);

module.exports = router;

function authenticate(req, res, next) {
  userService
    .authenticate(req.body)
    .then(user => {
      if (user) {
        try {
          res.cookie("sessionToken", user.token, {
            maxAge: 900000,
            httpOnly: true
          });
          console.log("Got to set cookie");
        } catch (exc) {
          console.log("Error while setting session cookie:", exc);
        }

        res.json(user);
      } else {
        res.status(400).json({ message: "Email or password is incorrect" });
      }
    })
    .catch(err => {
      next(err);
    });
}

function getAllActiveUsers(req, res, next) {
  userService
    .getAllUsers(req.user, req.query.organizationId, false)
    .then(data => {
      return res.json(data);
    })
    .catch(error => console.log("Error getAllActiveUsers:", error));
}

function getByEmployeeId(req, res, next) {
  userService
    .getByEmployeeId(req.user, req.params.id,req.query.programId)
    .then(user => {
      let _user = user
        ? {
            ...user,
            profilePhoto: converter.ConvertImageBufferToBase64(
              user.profilePhoto
            )
          }
        : user;

      console.log(' => ', _user);
      return res.json(_user);
    })
    .catch(error => console.log("Error getByEmployeeId:", error));
}

function getByUserId(req, res, next) {
  userService
    .getByUserId(req.user, req.params.id)
    .then(user => {
      let _user = user
        ? {
            ...user,
            profilePhoto: converter.ConvertImageBufferToBase64(
              user.profilePhoto
            )
          }
        : user;

      return res.json(_user);
    })
    .catch(error => console.log("Error getByUserId:", error));
}

function updateProfilePhoto(req, res, next) {
  userService
    .updateProfilePhoto(req.user, req.body.userId, req.body.profilePhoto)
    .then(data => res.json(data))
    .catch(err => next(err));
}

function changePassword(req, res, next) {
  console.log("Change password:", req.body);
  userService
    .changePassword(req.body, req.user)
    .then(user => {
      user
        ? res.json("Password changed successfully!")
        : res.status(400).json({ message: "Email or password is incorrect" });
    })
    .catch(err => {
      next(err);
    });
}

async function deleteEmployees(req, res, next) {
  console.log("deleteEmployees", req.body);
  userService
    .deleteEmployees(req.user, req.body.organizationId, req.body.employees)
    .then(() => res.json(true))
    .catch(err => next(err));
}

async function updateProfileData(req, res, next) {
    console.log("updateProfileData", req.body);
    userService
      .updateProfileData(req.user, req.body.phoneNumber, req.body.pagerNumber)
      .then(() => res.json("Data successfully updated!"))
      .catch(err => next(err));
  }

  
function updateBulk(req, res, next) {
  userService
    .updateBulk(req.user, req.body.users, req.body.organizationId)
    .then(() => res.json(true))
    .catch(err => next(err));
}