const express = require("express");
const receiptController = require("./../../controllers/receiptaccountname/receiptnumber");

const router = express.Router();

router.get("/lastReceiptNumber", receiptController.getLastReceiptNumber);

module.exports = router;
