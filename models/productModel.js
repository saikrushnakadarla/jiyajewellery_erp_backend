const db = require('../db');

const addProduct = (productData, callback) => {
  const sql = `INSERT INTO product (
        product_name, rbarcode, metal_type_id, purity_id, design_id, Category, design_master, purity, item_prefix,
        short_name, sale_account_head, purchase_account_head, tax_slab, tax_slab_id,
        hsn_code, maintain_tags, op_qty, op_value, op_weight, huid_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const sanitizeInteger = (value, defaultValue = 0) => {
    return value === "" || value === null ? defaultValue : value;
  };

  const values = [
    productData.product_name, 
    productData.rbarcode,
    sanitizeInteger(productData.metal_type_id, null), 
    sanitizeInteger(productData.purity_id, null), 
    sanitizeInteger(productData.design_id, null), 
    productData.Category, 
    productData.design_master,
    productData.purity, 
    productData.item_prefix, 
    productData.short_name, 
    productData.sale_account_head,
    productData.purchase_account_head, 
    productData.tax_slab, 
    sanitizeInteger(productData.tax_slab_id, null),
    productData.hsn_code, 
    productData.maintain_tags, 
    sanitizeInteger(productData.op_qty, 0),
    sanitizeInteger(productData.op_value, 0), 
    sanitizeInteger(productData.op_weight, 0), 
    productData.huid_no
  ];

  db.query(sql, values, callback);
};



// Fetch all products
const getAllProducts = (callback) => {
  const sql = 'SELECT * FROM product';
  db.query(sql, (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

// Function to fetch a product by ID
const getProductById = (id, callback) => {
  const sql = 'SELECT * FROM product WHERE product_id = ?';
  db.query(sql, [id], (err, result) => {
    callback(err, result);
  });
};

const updateProduct = (values, product_id, callback) => {
  const sql = `UPDATE product 
               SET 
                  product_name = ?, rbarcode = ?, Category = ?, design_master = ?, purity = ?, 
                  item_prefix = ?, short_name = ?, sale_account_head = ?, purchase_account_head = ?, 
                  tax_slab = ?, tax_slab_id = ?, hsn_code = ?, maintain_tags = ?, 
                  op_qty = ?, op_value = ?, op_weight = ?, huid_no = ?
               WHERE product_id = ?`;

  db.query(sql, [...values, product_id], callback);
};

const deleteProduct = (product_id, callback) => {
  const sql = `DELETE FROM product WHERE product_id = ?`;
  db.query(sql, [product_id], callback);
};

// Check if a product exists
const checkProductExists = (product_name, Category, purity) => {
  const query = `
    SELECT * FROM product 
    WHERE product_name = ? AND 
    Category = ? AND 

    purity = ?`;
  return new Promise((resolve, reject) => {
    db.query(query, [product_name, Category, purity], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// Insert a new product
const insertProduct = (product_name, Category, design_master, purity) => {
  const query = `
    INSERT INTO product (product_name, Category, design_master, purity) 
    VALUES (?, ?, ?, ?)`;
  return new Promise((resolve, reject) => {
    db.query(query, [product_name, Category, design_master, purity], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const getLastRbarcode = (callback) => {
  const query = "SELECT rbarcode FROM product WHERE rbarcode LIKE 'RB%' ORDER BY product_id DESC";
  db.query(query, callback);
};

const getLastPcode = (callback) => {
  const query = "SELECT rbarcode FROM product WHERE rbarcode LIKE '0%' ORDER BY product_id DESC";
  db.query(query, callback);
};




module.exports = {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  checkProductExists,
  insertProduct,
  deleteProduct,
  getLastRbarcode,
  getLastPcode
};
