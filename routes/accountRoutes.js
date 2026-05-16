// routes/accountRoutes.js
const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountsController');
const accountModel = require('../models/accountModel');

// Define routes for accounts
router.post('/account-details', accountModel.upload.array('images', 10), accountController.createAccount);
router.get('/get/account-details', accountController.getAllAccounts);
router.get('/get/account-details/:id', accountController.getAccountById);
router.put('/edit/account-details/:id', accountModel.upload.array('images', 10), accountController.updateAccount);
router.delete('/delete/account-details/:id', accountController.deleteAccount);

module.exports = router;