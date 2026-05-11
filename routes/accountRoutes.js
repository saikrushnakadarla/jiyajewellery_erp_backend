// routes/accountRoutes.js
const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountsController');

// Define routes for accounts
router.post('/post/accounts', accountController.createAccount);
router.get('/get/accounts', accountController.getAllAccounts);
router.get('/get/accounts/:id', accountController.getAccountById);
router.put('/put/accounts/:id', accountController.updateAccount);
router.delete('/delete/accounts/:id', accountController.deleteAccount);

module.exports = router;
