const express = require('express');
const router = express.Router();
const accountsgroupController = require('./../controllers/accountGroup');

router.get('/accountsgroup', accountsgroupController.getAccountsGroup);
router.post('/post/states', accountsgroupController.addState);
router.get('/get/states', accountsgroupController.getStates);

module.exports = router;
