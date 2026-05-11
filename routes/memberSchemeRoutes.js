const express = require('express');
const router = express.Router();
const memberSchemeController = require('../controllers/memberSchemeController');

// POST API to add a member scheme
router.post('/member-schemes', memberSchemeController.addMemberScheme);

// GET API to fetch all member schemes
router.get('/get/member-schemes', memberSchemeController.getAllMemberSchemes);

module.exports = router;
