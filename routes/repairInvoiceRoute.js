const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairInvoiceController');

router.post('/convert-repair', repairController.convertRepairToInvoice);
router.get('/get-repair-invoice/:order_number', repairController.getRepairInvoice);

module.exports = router;
