const db = require("./../../db");

const getLastReceiptNumber = (callback) => {
  const query = "SELECT receipt_no FROM payments WHERE receipt_no LIKE 'RCP%' ORDER BY id DESC";
  db.query(query, callback);
};

module.exports = { getLastReceiptNumber };
