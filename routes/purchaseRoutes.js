const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

// Route to save purchase data
router.post('/post/purchase', purchaseController.savePurchase);
router.get('/get/purchases', purchaseController.getPurchases);
router.delete('/delete-purchases/:id', purchaseController.deletePurchase);
router.delete('/deletepurchases/:invoice', purchaseController.deletePurchaseByInvoice);
router.get('/purchase/:id', purchaseController.getPurchase);
router.put('/purchases/:id', purchaseController.updatePurchase);

router.get("/get-unique-purchase-details", purchaseController.getAllUniquePurchaseDetails);
router.get("/get-purchase-details/:invoice", purchaseController.getRepairDetailsByInvoiceNumber);
router.get("/purchase-details/:invoice", purchaseController.getAllRepairDetailsByInvoiceNumber);

router.post("/update-remark", purchaseController.updateRemark);
module.exports = router;
