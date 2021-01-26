const express = require('express');
const router = express.Router();
const Permissions = require('./permissions');
const authorize = require('helpers/authorize')

// routes
router.get('/all', authorize(Permissions.api.permissions.get), getAll);

module.exports = router;

function getAll(req, res, next) {
    res.json(Permissions)
}

function getOrganizationAssetsDomain(req, res, next) {
    organizationService.getOrganizationSettingsByOrgId(req.params.id)
        .then(settings => {
                console.log("---")
                console.log(settings)
                console.log("---")
                settings && settings.assetsDomain
                    ? res.json({assetsDomain: settings.assetsDomain})
                    : res.json({assetsDomain: process.env.UPLOADS_URL})
            }
        )
        .catch(err => {
            console.log("ERROR: ",err);
            res.status(500).json({"message": "internal error"})
        });
}


function getById(req, res, next) {
    organizationService.getById(req.params.id, req.user)
        .then(organization => organization ? res.json(organization) : res.status(404).json({message: "Not found"}))
        .catch(err => next(err));
}

function create(req, res, next) {
    organizationService.create(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function update(req, res, next) {
    organizationService.update(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function deleteOrganizations(req, res, next) {
    organizationService.deleteOrganizations(req.body, req.user)
        .then(() => res.json(true))
        .catch(err => next(err));
}

function sendEmail(req, res, next) {
    organizationService.sendEmail(req.body, req.user)
        .then(data => data && data == true? res.json(data) : res.status(404).json({message: "Not Connected"}))
        .catch(err => next(err));
}

function sendTestEmail(req, res, next) {
    organizationService.sendTestEmail(req.body, req.user)
        .then(data => data && data == true? res.json(data) : res.status(404).json({message: "Not Connected"}))
        .catch(err => next(err));
}

