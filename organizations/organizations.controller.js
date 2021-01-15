const express = require('express');
const router = express.Router();
const organizationService = require('./organization.service');
const authorize = require('helpers/authorize')

const Permissions = require("permissions/permissions")

// routes
router.post('/', authorize(Permissions.api.organizations.create), create);
router.put('/', authorize(Permissions.api.organizations.update), update);
router.delete('/', authorize(Permissions.api.organizations.delete), deleteOrganizations);
router.get('/', authorize(Permissions.api.organizations.get.superadminaccess), getAll);
router.get('/:id', authorize(Permissions.api.organizations.get.useraccess), getById);
router.post('/email', authorize(Permissions.api.organizations.email.send), sendEmail);
router.post('/testEmail', authorize(Permissions.api.organizations.email.send), sendTestEmail);
router.get('/:id/assetsDomain', authorize(Permissions.api.organizations.assetsDomain.get), getOrganizationAssetsDomain);

module.exports = router;

function getAll(req, res, next) {
    organizationService.getAll(
        req.user,
        req.query.pageId,
        req.query.recordsPerPage,
        req.query.filter
    )
    .then(organizations => organizations && organizations.totalNumberOfRecords > 0 ? res.json(organizations): res.status(404).json({message: "Not found"}))
    .catch(err => next(err));
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

