// routes/accountRoutes.js
const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountsController');
const accountModel = require('../models/accountModel');

// Configure upload to handle both 'images' and 'profile_photo' fields
const uploadFields = accountModel.upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'profile_photo', maxCount: 1 }
]);

// Define routes for accounts
router.post('/account-details', uploadFields, accountController.createAccount);
router.get('/get/account-details', accountController.getAllAccounts);
router.get('/get/account-details/:id', accountController.getAccountById);
router.put('/edit/account-details/:id', uploadFields, accountController.updateAccount);
router.delete('/delete/account-details/:id', accountController.deleteAccount);

router.post('/salesman/login', accountController.salesmanLogin);
router.get('/salesman/check-duty-hours/:accountId', accountController.checkDutyHours);

module.exports = router;