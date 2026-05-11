const express = require('express');
const assignController = require('../controllers/repairDetailsController');

const router = express.Router();

// Define route for adding repair details
router.post('/assign/repairdetails', assignController.addRepairDetails);
router.get('/assigned-repairdetails', assignController.getAssignedRepairDetails);
router.delete('/assigned-repairdetails/:id', assignController.deleteAssignedRepairDetail);
router.put('/repairs/:repair_id', assignController.updateRepairDetails);
router.get('/assigned-repairdetails/:id', assignController.getAssignedRepairDetailsById);
router.put('/assigned-repairdetails/:id', assignController.updateAssignedRepairDetail);

router.post('/update-status', assignController.updateStatus);

module.exports = router;
