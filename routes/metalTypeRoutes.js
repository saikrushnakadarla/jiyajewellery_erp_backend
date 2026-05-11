// routes/metalTypeRoutes.js
const express = require('express');
const router = express.Router();
const metalTypeController = require('../controllers/metaltypeController');

// Define routes for MetalType
router.post('/metaltype', metalTypeController.createMetalType);
router.get('/metaltype', metalTypeController.getAllMetalTypes);
router.get('/metaltype/:id', metalTypeController.getMetalTypeById);
router.put('/metaltype/:id', metalTypeController.updateMetalType);
router.delete('/metaltype/:id', metalTypeController.deleteMetalType);

module.exports = router;
