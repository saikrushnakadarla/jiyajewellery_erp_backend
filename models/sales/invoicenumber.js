const db = require("./../../db");

const getLastInvoiceNumber = (callback) => {
  const query = "SELECT invoice_number FROM repair_details WHERE invoice_number LIKE 'INV%' ORDER BY id DESC";
  db.query(query, callback);
};

const getLastOrderNumber = (callback) => {
  const query = "SELECT order_number FROM repair_details WHERE order_number LIKE 'ORD%' ORDER BY id DESC";
  db.query(query, callback);
};

const findInvoiceByOrderNumber = (order_number) => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM repair_details WHERE order_number = ?",
      [order_number],
      (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results.length > 0 ? results[0] : null);
      }
    );
  });
};


const updateRepairStatus = (id, status, callback) => {
  const query = "UPDATE repair_details SET sale_status = ? WHERE id = ?";
  db.query(query, [status, id], callback);
};

module.exports = { getLastInvoiceNumber, getLastOrderNumber, findInvoiceByOrderNumber, updateRepairStatus };
