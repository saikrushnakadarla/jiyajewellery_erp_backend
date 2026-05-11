const db = require("./../../db");

const getLastPaymentNumber = (callback) => {
  const query = "SELECT payment_no FROM purchasepayments WHERE payment_no LIKE 'PAY%' ORDER BY id DESC";
  db.query(query, callback);
};

module.exports = { getLastPaymentNumber };
