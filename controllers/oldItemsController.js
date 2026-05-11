const oldItemsModel = require('../models/oldItemsModel');

const addProduct = (req, res) => {
  const {
    product, metal, purity, purityPercentage, hsn_code, gross, dust, ml_percent, net_wt, remarks, rate, total_amount, total_old_amount, invoice_id
  } = req.body;

  const productData = [
    product, metal, purity, purityPercentage, hsn_code, gross, dust, ml_percent, net_wt, remarks, rate, total_amount, total_old_amount, invoice_id
  ];

  oldItemsModel.addProduct(productData, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      res.status(500).send('Error inserting data');
    } else {
      res.status(201).send({ id: result.insertId, message: 'Product added successfully' });
    }
  });
};

const getAllProducts = (req, res) => {
  oldItemsModel.getAllProducts((err, results) => {
    if (err) {
      console.error('Error retrieving data:', err);
      res.status(500).send('Error retrieving data');
    } else {
      res.status(200).json(results);
    }
  });
};

const getProductByInvoiceId = (req, res) => {
  const { invoice_id } = req.params;

  oldItemsModel.getProductByInvoiceId(invoice_id, (err, results) => {
    if (err) {
      console.error('Error retrieving data by invoice ID:', err);
      res.status(500).send('Error retrieving data');
    } else {
      res.status(200).json(results);
    }
  });
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductByInvoiceId,
};
