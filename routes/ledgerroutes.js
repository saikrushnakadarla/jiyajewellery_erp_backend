const express = require('express');
const router = express.Router();
const ledgerController = require('./../controllers/ledgercontroller');

// GET routes
router.get('/ledger', ledgerController.getAllLedgerEntries);
router.get('/ledger/:id', ledgerController.getLedgerEntryById);
router.get('/ledger/account/:account_id', ledgerController.getLedgerEntriesByAccountId);  // NEW - Get by account ID
router.get('/ledger/type/:transaction_type', ledgerController.getLedgerEntriesByType);
router.get('/ledger/date-range', ledgerController.getLedgerEntriesByDateRange);
router.get('/ledger/date-range/account', ledgerController.getLedgerEntriesByDateRangeAndAccount);  // NEW - Get by date range and account
router.get('/ledger/summary/:account_id', ledgerController.getLedgerSummaryByAccountId);  // NEW - Get summary by account ID

// POST route
router.post('/ledger', ledgerController.createLedgerEntry);

// PUT route
router.put('/ledger/:id', ledgerController.updateLedgerEntry);

// DELETE route
router.delete('/ledger/:id', ledgerController.deleteLedgerEntry);

module.exports = router;