const express = require('express');
const { handleUpdateRepairDetails, handleUpdateOpenTags, handleAddAvailableEntry,handleUpdateProduct } = require('../controllers/saleReturnController');

const router = express.Router();

router.post('/updateRepairDetails', handleUpdateRepairDetails);
router.post('/updateOpenTags', handleUpdateOpenTags);
router.post('/addAvailableEntry', handleAddAvailableEntry);
router.post('/updateProduct', handleUpdateProduct);

module.exports = router;
