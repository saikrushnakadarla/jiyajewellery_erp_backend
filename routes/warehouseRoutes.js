// In your warehouse routes file (e.g., warehouseRoutes.js)
const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');

// Add this POST route for creating warehouse
router.post('/api/warehouse', warehouseController.createWarehouse);
router.get('/api/warehouse', warehouseController.getAllWarehouses);

module.exports = router;