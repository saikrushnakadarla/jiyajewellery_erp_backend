const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');

router.post('/add-receipt', receiptController.addReceipt);
router.get('/get/receipts', receiptController.getAllReceipts);
router.get('/get/receipts/:id', receiptController.getReceiptById);
router.put('/put/receipts/:id', receiptController.updateReceipt);
router.delete('/delete/receipts/:id', receiptController.deleteReceipt);

module.exports = router;
