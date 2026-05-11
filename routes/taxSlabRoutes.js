const express = require('express');
const TaxSlabController = require('../controllers/taxSlabController');

const router = express.Router();

router.post('/post/taxslabs', TaxSlabController.createTaxSlab);
router.get('/get/taxslabs', TaxSlabController.fetchAllTaxSlabs);
router.get('/get/taxslabs/:id', TaxSlabController.fetchTaxSlabById);

module.exports = router;
