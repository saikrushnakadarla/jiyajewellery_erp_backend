const express = require('express');
const router = express.Router();
const { fetchEmployeeCompensationAccounts } = require('./../../controllers/sales/accountController');
const RepairController = require('./../../controllers/sales/AssignWorker'); 

router.get('/get-employee-compensation-accounts', fetchEmployeeCompensationAccounts);


router.post('/assign-worker', RepairController.assignWorker);

module.exports = router;
