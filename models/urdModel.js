const db = require('../db'); // Assuming you have a database connection file

// Function to insert purchase details into the database
const insertUrdPurchaseDetail = (customerDetails, item, callback) => {
  const query = `
    INSERT INTO urd_purchase_details 
    (customer_id, account_name, mobile, email, address1, address2, city, state, state_code, aadhar_card, gst_in, 
     pan_card, date, urdpurchase_number, product_id, product_name, metal, purity, hsn_code, gross, dust, touch_percent, 
     ml_percent, eqt_wt, remarks, rate, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(query, [
    customerDetails.customer_id,
    customerDetails.account_name,
    customerDetails.mobile,
    customerDetails.email,
    customerDetails.address1,
    customerDetails.address2,
    customerDetails.city,
    customerDetails.state,
    customerDetails.state_code,
    customerDetails.aadhar_card,
    customerDetails.gst_in,
    customerDetails.pan_card,
    customerDetails.date,
    customerDetails.urdpurchase_number,
    item.product_id,
    item.product_name,
    item.metal,
    item.purity,
    item.hsn_code,
    item.gross,
    item.dust,
    item.touch_percent,
    item.ml_percent,
    item.eqt_wt,
    item.remarks,
    item.rate,
    item.total_amount,
  ], callback);
};

const getAllPurchases = (callback) => {
  const query = `
    SELECT 
      urd.customer_id, 
      urd.account_name, 
      urd.mobile, 
      urd.email, 
      urd.address1, 
      urd.address2, 
      urd.city, 
      urd.state, 
      urd.state_code, 
      urd.aadhar_card, 
      urd.gst_in, 
      urd.pan_card, 
      urd.date, 
      urd.urdpurchase_number, 
      urd.product_id, 
      urd.product_name, 
      urd.metal, 
      urd.purity, 
      urd.hsn_code, 
      urd.gross, 
      urd.dust, 
      urd.touch_percent, 
      urd.ml_percent, 
      urd.eqt_wt, 
      urd.remarks, 
      urd.rate, 
      urd.total_amount
    FROM urd_purchase_details urd
    ORDER BY urd.date DESC`;

  db.query(query, callback);
};

const getLastURDPurchaseNumber = (callback) => {
  const query = "SELECT urdpurchase_number FROM estimate WHERE urdpurchase_number LIKE 'EST%' ORDER BY id DESC";
  db.query(query, callback);
};

// Update URD purchase details in the database
const updateUrdPurchase = (urdPurchaseNumber, data, callback) => {
  const {
    product_name,
    metal,
    purity,
    hsn_code,
    gross,
    dust,
    touch_percent,
    ml_percent,
    eqt_wt,
    remarks,
    rate,
    total_amount,
  } = data;

  // Start constructing the query dynamically based on provided fields
  let query = `UPDATE urd_purchase_details SET `;
  let values = [];
  
  if (product_name) {
    query += "product_name = ?, ";
    values.push(product_name);
  }
  if (metal) {
    query += "metal = ?, ";
    values.push(metal);
  }
  if (purity) {
    query += "purity = ?, ";
    values.push(purity);
  }
  if (hsn_code) {
    query += "hsn_code = ?, ";
    values.push(hsn_code);
  }
  if (gross !== undefined) {
    query += "gross = ?, ";
    values.push(gross);
  }
  if (dust !== undefined) {
    query += "dust = ?, ";
    values.push(dust);
  }
  if (touch_percent !== undefined) {
    query += "touch_percent = ?, ";
    values.push(touch_percent);
  }
  if (ml_percent !== undefined) {
    query += "ml_percent = ?, ";
    values.push(ml_percent);
  }
  if (eqt_wt !== undefined) {
    query += "eqt_wt = ?, ";
    values.push(eqt_wt);
  }
  if (remarks) {
    query += "remarks = ?, ";
    values.push(remarks);
  }
  if (rate !== undefined) {
    query += "rate = ?, ";
    values.push(rate);
  }
  if (total_amount !== undefined) {
    query += "total_amount = ?, ";
    values.push(total_amount);
  }

  // Remove the last comma and space
  query = query.slice(0, -2);

  // Add the WHERE clause
  query += " WHERE urdpurchase_number = ?";

  // Add urdPurchaseNumber to values
  values.push(urdPurchaseNumber);

  // Execute the query
  db.query(query, values, callback);
};



// Delete purchase details from the database
const deleteUrdPurchaseDetail = (urdpurchase_number, callback) => {
  const query = "DELETE FROM urd_purchase_details WHERE urdpurchase_number = ?";
  db.query(query, [urdpurchase_number], callback);
};


module.exports = { insertUrdPurchaseDetail,getAllPurchases,getLastURDPurchaseNumber,updateUrdPurchase, deleteUrdPurchaseDetail };
