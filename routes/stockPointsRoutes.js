const express = require('express');
const router = express.Router();
const stockPointsController = require('../controllers/stockPointsController');

router.post('/stockpoints', stockPointsController.createStockPoint);
router.get('/stockpoints', stockPointsController.getAllStockPoints);
router.get('/stockpoints/:id', stockPointsController.getStockPointById);
router.get('/warehouse', stockPointsController.getStockPointsByWarehouse);
router.put('/stockpoints/:id', stockPointsController.updateStockPointById);
router.delete('/stockpoints/:id', stockPointsController.deleteStockPointById);

module.exports = router;