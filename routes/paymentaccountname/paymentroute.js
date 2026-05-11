const express = require("express");
const paymentController = require("./../../controllers/paymentaccountname/paymentnumber");

const router = express.Router();

router.get("/lastPaymentNumber", paymentController.getLastPaymentNumber);

module.exports = router;
