const express = require('express');
const router = express.Router();
const stoneDetailsController = require('../controllers/stoneDetailsController');

// API routes
router.post('/post/addProductstonedetails', stoneDetailsController.addProductStoneDetailsController);
router.get('/get/getProductstonedetails', stoneDetailsController.getStoneDetails);
router.put('/put/updateProductstonedetails/:id', stoneDetailsController.updateStoneDetail);
router.delete('/delete/deleteProductstonedetails/:id', stoneDetailsController.deleteStoneDetail);

module.exports = router;
