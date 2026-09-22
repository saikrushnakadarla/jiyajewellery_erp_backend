const express = require("express");
const router = express.Router();
const {
  addSalesPayment,
  getSalesPayments,
  lastSalesPaymentNumber,
} = require("../controllers/salesPaymentController");

router.post("/salesPayments", addSalesPayment);
router.get("/sales-payments", getSalesPayments);
router.get("/lastSalesPaymentNumber", lastSalesPaymentNumber);

module.exports = router;