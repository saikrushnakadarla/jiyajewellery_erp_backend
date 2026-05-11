const db = require('../db');

const addProduct = (productData, callback) => {
  const query = `
    INSERT INTO old_items 
    (product, metal, purity, purityPercentage, hsn_code, gross, dust, ml_percent, net_wt, remarks, rate, total_amount, total_old_amount, invoice_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, productData, callback);
};

const getAllProducts = (callback) => {
  const query = 'SELECT * FROM old_items';
  db.query(query, callback);
};

const getProductByInvoiceId = (invoiceId, callback) => {
  const query = 'SELECT * FROM old_items WHERE invoice_id = ?';
  db.query(query, [invoiceId], callback);
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductByInvoiceId,
};
