const express = require("express");
const { getAccountNames } = require("./../../controllers/receiptaccountname/receiptaccountname");

const router = express.Router();

// Route for fetching account names and mobile numbers
router.get("/account-names", getAccountNames);

module.exports = router;
