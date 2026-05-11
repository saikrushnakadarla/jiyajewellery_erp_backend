const express = require("express");
const { getAccountNames } = require("./../../controllers/paymentaccountname/paymentaccountname");

const router = express.Router();

// Route for fetching account names
router.get("/payment-account-names", getAccountNames);

module.exports = router;
