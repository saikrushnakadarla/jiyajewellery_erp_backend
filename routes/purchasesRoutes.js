const express = require('express');
const {getLastCode,getLastInvoice, updateBalanceAfterReceipt, } = require('../controllers/purchasesController');

const router = express.Router();
router.put('/put/update-balance-after-receipt', updateBalanceAfterReceipt);
router.get('/lastRbarcode', getLastCode);
router.get('/lastInvoice', getLastInvoice);

module.exports = router;
