const express = require("express");
const router = express.Router();
const { addPurchasePayment,getPurchasePayments } = require("../controllers/purchasePaymentController");

// Define route for inserting purchase payment
router.post("/purchasePayments", addPurchasePayment);
router.get("/purchase-payments", getPurchasePayments);

module.exports = router;
