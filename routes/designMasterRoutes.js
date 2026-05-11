// routes/designMasterRoutes.js
const express = require('express');
const router = express.Router();
const designMasterController = require('../controllers/designController');

// Define routes for DesignMaster
router.post('/designmaster', designMasterController.createDesignMaster);
router.get('/designmaster', designMasterController.getAllDesignMasters);
router.get('/designmaster/:id', designMasterController.getDesignMasterById);
router.put('/designmaster/:id', designMasterController.updateDesignMaster);
router.delete('/designmaster/:id', designMasterController.deleteDesignMaster);

module.exports = router;
