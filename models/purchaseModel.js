const db = require('../db'); // Database connection

// Function to check if an invoice exists
const checkInvoiceExists = async (id, invoice) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT COUNT(*) AS count FROM purchases WHERE id = ? AND invoice = ?";
    db.query(query, [id, invoice], (err, result) => {
      if (err) return reject(err);
      resolve(result[0].count > 0);
    });
  });
};

const updatePurchase = (formData) => {

  const updatePurchaseQuery = `
    UPDATE purchases SET
      customer_id = ?, mobile = ?, account_name = ?, gst_in = ?, terms = ?, invoice = ?, 
      bill_no = ?, date = ?, bill_date = ?, due_date = ?, Pricing = ?, product_id = ?, 
      category = ?, metal_type = ?, rbarcode = ?, hsn_code = ?, pcs = ?, 
      gross_weight = ?, stone_weight = ?, deduct_st_Wt = ?, net_weight = ?, 
      purity = ?, purityPercentage = ?, pure_weight = ?, wastage_on = ?, wastage = ?, wastage_wt = ?, 
      Making_Charges_On = ?, Making_Charges_Value = ?, total_mc = ?, total_pure_wt = ?, 
      paid_pure_weight = ?, balance_pure_weight = ?, rate = ?, total_amount = ?, 
      tax_slab = ?, tax_amt = ?, net_amt = ?, rate_cut = ?, rate_cut_wt = ?, rate_cut_amt = ?,
      paid_amount = ?, balance_amount = ?, hm_charges = ?, charges = ?, remarks = ?, 
      cut = ?, color = ?, clarity = ?, carat_wt = ?, stone_price = ?, 
      final_stone_amount = ?, balance_after_receipt = ?, balWt_after_payment = ?, 
      paid_by = ?, bal_wt_amt = ?, other_charges = ?, overall_taxableAmt = ?, 
      overall_taxAmt = ?, overall_netAmt = ?, overall_hmCharges = ?, tag_id = ?, discount_amt = ?, final_amt = ?
    WHERE invoice = ? AND id = ?
  `;

  const formatNumericValue = (value) => (value === '' ? null : value);
  const formatValue = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    return value;
  };
  const formatTaxSlab = (value) => (value ? value.trim() : null);

  const bal_wt_amt =
    (formData.balance_pure_weight > 0 ? formData.balance_pure_weight : 0) ||
    (formData.balance_amount > 0 ? formData.balance_amount : 0);

  let paid_by = null;
  if (formData.paid_pure_weight > 0 && formData.paid_amount > 0) {
    paid_by = "By Amount";
  } else if (formData.paid_pure_weight > 0) {
    paid_by = "By Weight";
  }

  const overall_taxableAmt = formatValue(formData.overall_taxableAmt);
  const overall_taxAmt = formatValue(formData.overall_taxAmt);
  const overall_netAmt = formatValue(formData.overall_netAmt);
  const overall_hmCharges = formatValue(formData.overall_hmCharges);

  const purchaseValues = [
    formatNumericValue(formData.customer_id),
    formatNumericValue(formData.mobile),
    formatNumericValue(formData.account_name),
    formatNumericValue(formData.gst_in),
    formatNumericValue(formData.terms),
    formatNumericValue(formData.invoice),
    formatNumericValue(formData.bill_no),
    formatNumericValue(formData.date),
    formatNumericValue(formData.bill_date),
    formatNumericValue(formData.due_date),
    formatNumericValue(formData.Pricing),
    formatNumericValue(formData.product_id),
    formatNumericValue(formData.category),
    formatNumericValue(formData.metal_type),
    formatNumericValue(formData.rbarcode),
    formatNumericValue(formData.hsn_code),
    formatNumericValue(formData.pcs),
    formatValue(formData.gross_weight),
    formatValue(formData.stone_weight),
    formatValue(formData.deduct_st_Wt),
    formatValue(formData.net_weight),
    formatNumericValue(formData.purity),
    formatNumericValue(formData.purityPercentage),
    formatNumericValue(formData.pure_weight),
    formatNumericValue(formData.wastage_on),
    formatNumericValue(formData.wastage),
    formatValue(formData.wastage_wt),
    formatNumericValue(formData.Making_Charges_On),
    formatNumericValue(formData.Making_Charges_Value),
    formatValue(formData.total_mc),
    formatValue(formData.total_pure_wt),
    formatValue(formData.paid_pure_weight),
    formatValue(formData.balance_pure_weight),
    formatValue(formData.rate),
    formatValue(formData.total_amount),
    formatTaxSlab(formData.tax_slab),
    formatValue(formData.tax_amt),
    formatValue(formData.net_amt),
    formatValue(formData.rate_cut),
    formatValue(formData.rate_cut_wt),
    formatValue(formData.rate_cut_amt),
    formatValue(formData.paid_amount),
    formatValue(formData.balance_amount),
    formatValue(formData.hm_charges),
    formatValue(formData.charges),
    formatValue(formData.remarks),
    formatValue(formData.cut),
    formatValue(formData.color),
    formatValue(formData.clarity),
    formatValue(formData.carat_wt),
    formatValue(formData.stone_price),
    formatValue(formData.final_stone_amount),
    formatValue(formData.balance_after_receipt),
    formatValue(formData.balWt_after_payment),
    formatValue(paid_by),
    formatValue(bal_wt_amt),
    formatValue(formData.other_charges),
    overall_taxableAmt,
    overall_taxAmt,
    overall_netAmt,
    overall_hmCharges,
    formatValue(formData.tag_id),
    formatValue(formData.discount_amt),
    formatValue(formData.final_amt),
    formatValue(formData.invoice),
    formatValue(formData.id)
  ];

  return new Promise((resolve, reject) => {
    db.query(updatePurchaseQuery, purchaseValues, (err, result) => {
      if (err) return reject(err);
      if (result.affectedRows === 0) {
        console.warn(`Warning: No rows updated for invoice ${formData.invoice} and ID ${formData.id}. Check values.`);
      }

      const updateRateCutQuery = `
        UPDATE ratecuts SET 
          category = ?, total_pure_wt = ?, rate_cut_wt = ?, rate_cut = ?, rate_cut_amt = ?, 
          paid_amount = ?, balance_amount = ?, paid_wt = ?, bal_wt = ?, paid_by = ?
        WHERE purchase_id = ? AND invoice = ? AND total_pure_wt = ?
      `;

      const paidAmount = parseFloat(formData.paid_amount) || 0;
      const rateCut = parseFloat(formData.rate_cut) || 1;
      const rateCutWt = parseFloat(formData.rate_cut_wt) || 0;
      const paidWt = paidAmount > 0 && rateCut > 0 ? paidAmount / rateCut : 0;
      const balWt = rateCutWt - paidWt;
      const safeBalWt = isNaN(balWt) ? 0 : balWt;
      const paidBy = rateCutWt > 0 ? "By Amount" : "By Weight";

      const rateCutValues = [
        formatValue(formData.category), formatValue(formData.total_pure_wt), formatValue(formData.rate_cut_wt),
        formatValue(formData.rate_cut), formatValue(formData.rate_cut_amt), formatValue(formData.paid_amount),
        formatValue(formData.balance_amount), paidWt, safeBalWt, paidBy,
        formatValue(formData.id), formatValue(formData.invoice), formatValue(formData.total_pure_wt)
      ];

      db.query(updateRateCutQuery, rateCutValues, (rateCutErr, rateCutResult) => {
        if (rateCutErr) return reject(rateCutErr);
        resolve({ purchaseUpdate: result, rateCutUpdate: rateCutResult });
      });
    });
  });
};

const insertPurchase = (formData) => {
  const insertQuery = `
    INSERT INTO purchases (
      customer_id, mobile, account_name, gst_in, terms, invoice, bill_no, date, bill_date, due_date, Pricing, product_id, category, 
      metal_type, rbarcode, hsn_code, pcs, gross_weight, stone_weight, deduct_st_Wt, net_weight, purity, purityPercentage, pure_weight, wastage_on, wastage, 
      wastage_wt, Making_Charges_On, Making_Charges_Value, total_mc, total_pure_wt, paid_pure_weight, balance_pure_weight, rate, 
      total_amount, tax_slab, tax_amt, net_amt, rate_cut, rate_cut_wt, rate_cut_amt, paid_amount, balance_amount, hm_charges, charges, remarks, 
      cut, color, clarity, carat_wt, stone_price, final_stone_amount, balance_after_receipt, balWt_after_payment, paid_by, bal_wt_amt,
      other_charges, overall_taxableAmt, overall_taxAmt, overall_netAmt, overall_hmCharges, tag_id, discount_amt, final_amt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const insertRateCutQuery = `
    INSERT INTO rateCuts (
      purchase_id, invoice, category, total_pure_wt, rate_cut_wt, rate_cut, rate_cut_amt, paid_amount, balance_amount, paid_wt, bal_wt, paid_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const updateProductQuery = `
    UPDATE product
    SET 
      pur_qty = COALESCE(pur_qty, 0) + ?,
      pur_weight = COALESCE(pur_weight, 0) + ?
    WHERE product_id = ?
  `;

  const updateBalanceQuery = `
    UPDATE product
    SET 
      bal_qty = COALESCE(pur_qty, 0) - COALESCE(sale_qty, 0),
      bal_weight = COALESCE(pur_weight, 0) - COALESCE(sale_weight, 0)
    WHERE product_id = ?
  `;

  const formatNumericValue = (value) => (value === '' ? null : value);

  const formatValue = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    return value;
  };

  const formatTaxSlab = (value) => (!value ? null : value.trim());

  const bal_wt_amt =
    (formData.balance_pure_weight > 0 ? formData.balance_pure_weight : 0) ||
    (formData.balance_amount > 0 ? formData.balance_amount : 0);

  let paid_by = formData.rate_cut_wt > 0 ? "By Amount" : "By Weight";

  const overall_taxableAmt = formatValue(formData.overall_taxableAmt);
  const overall_taxAmt = formatValue(formData.overall_taxAmt);
  const overall_netAmt = formatValue(formData.overall_netAmt);
  const overall_hmCharges = formatValue(formData.overall_hmCharges);

  const values = [
    formatNumericValue(formData.customer_id),
    formatNumericValue(formData.mobile),
    formatNumericValue(formData.account_name),
    formatNumericValue(formData.gst_in),
    formatNumericValue(formData.terms),
    formatNumericValue(formData.invoice),
    formatNumericValue(formData.bill_no),
    formatNumericValue(formData.date),
    formatNumericValue(formData.bill_date),
    formatNumericValue(formData.due_date),
    formatNumericValue(formData.Pricing),
    formatNumericValue(formData.product_id),
    formatNumericValue(formData.category),
    formatNumericValue(formData.metal_type),
    formatNumericValue(formData.rbarcode),
    formatNumericValue(formData.hsn_code),
    formatNumericValue(formData.pcs),
    formatValue(formData.gross_weight),
    formatValue(formData.stone_weight),
    formatValue(formData.deduct_st_Wt),
    formatValue(formData.net_weight),
    formatNumericValue(formData.purity),
    formatNumericValue(formData.purityPercentage),
    formatNumericValue(formData.pure_weight),
    formatNumericValue(formData.wastage_on),
    formatNumericValue(formData.wastage),
    formatValue(formData.wastage_wt),
    formatNumericValue(formData.Making_Charges_On),
    formatNumericValue(formData.Making_Charges_Value),
    formatValue(formData.total_mc),
    formatValue(formData.total_pure_wt),
    formatValue(formData.paid_pure_weight),
    formatValue(formData.balance_pure_weight),
    formatValue(formData.rate),
    formatValue(formData.total_amount),
    formatTaxSlab(formData.tax_slab),
    formatValue(formData.tax_amt),
    formatValue(formData.net_amt),
    formatValue(formData.rate_cut),
    formatValue(formData.rate_cut_wt),
    formatValue(formData.rate_cut_amt),
    formatValue(formData.paid_amount),
    formatValue(formData.balance_amount),
    formatValue(formData.hm_charges),
    formatValue(formData.charges),
    formatValue(formData.remarks),
    formatValue(formData.cut),
    formatValue(formData.color),
    formatValue(formData.clarity),
    formatValue(formData.carat_wt),
    formatValue(formData.stone_price),
    formatValue(formData.final_stone_amount),
    formatValue(formData.balance_after_receipt),
    formatValue(formData.balWt_after_payment),
    formatValue(paid_by),
    formatValue(bal_wt_amt),
    formatValue(formData.other_charges),
    overall_taxableAmt,
    overall_taxAmt,
    overall_netAmt,
    overall_hmCharges,
    formatValue(formData.tag_id),
    formatValue(formData.discount_amt),
    formatValue(formData.final_amt),
  ];

  return new Promise((resolve, reject) => {
    db.query(insertQuery, values, (err, result) => {
      if (err) return reject(err);

      const purchaseId = result.insertId;

      // If rate_cut_wt > 0, insert into rateCuts table
      if (parseFloat(formData.rate_cut_wt) > 0 || formData.Pricing === "By fixed") {
        const paidAmount = parseFloat(formData.paid_amount) || 0;
        const rateCut = parseFloat(formData.rate_cut) || 1; // Avoid division by zero
        const rateCutWt = parseFloat(formData.rate_cut_wt) || 0;
        const rateCutAmt =
          formData.Pricing === "By fixed"
            ? parseFloat(formData.final_amt) || 0
            : parseFloat(formData.rate_cut_amt) || 0;

        // Calculate paidWt safely
        const paidWt = paidAmount > 0 && rateCut > 0 ? paidAmount / rateCut : 0;

        // Calculate balWt safely
        const balWt = rateCutWt - paidWt;
        const safeBalWt = isNaN(balWt) ? 0 : balWt;
        const paidBy = formData.Pricing === "By fixed" ? "By Amount" : rateCutWt > 0 ? "By Amount" : "By Weight";

        const rateCutValues = [
          purchaseId,
          formatValue(formData.invoice),
          formatValue(formData.category),
          formatValue(formData.total_pure_wt),
          formatValue(formData.rate_cut_wt),
          formatValue(formData.rate_cut),
          formatValue(rateCutAmt), // Updated to consider Pricing == "By fixed"
          formatValue(formData.paid_amount),
          formatValue(formData.balance_amount),
          paidWt,
          safeBalWt,
          paidBy,
        ];

        db.query(insertRateCutQuery, rateCutValues, (err) => {
          if (err) return reject(err);

          db.query(updateProductQuery, [formData.pcs, formData.gross_weight, formData.product_id], (err) => {
            if (err) return reject(err);

            db.query(updateBalanceQuery, [formData.product_id], (err) => {
              if (err) return reject(err);
              resolve(result);
            });
          });
        });
      } else {
        db.query(updateProductQuery, [formData.pcs, formData.gross_weight, formData.product_id], (err) => {
          if (err) return reject(err);

          db.query(updateBalanceQuery, [formData.product_id], (err) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }
    });
  });
};


const insertStoneDetails = async (stoneData) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO stone_details (purchase_id, stoneName, cut, color, clarity, stoneWt, caratWt, stonePrice, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      stoneData.purchase_id,
      stoneData.stoneName,
      stoneData.cut,
      stoneData.color,
      stoneData.clarity,
      stoneData.stoneWt,
      stoneData.caratWt,
      stoneData.stonePrice,
      stoneData.amount,
    ];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting stone details:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const getAllUniqueInvoices = (callback) => {
  const sql = `
    SELECT * 
    FROM purchases r1
    WHERE r1.id = (
      SELECT MAX(r2.id) 
      FROM purchases r2
      WHERE r1.invoice = r2.invoice
    )
  `;
  db.query(sql, callback);
};

const getByInvoiceNumber = (invoiceNumber, callback) => {
  const sql = `
    SELECT 
      id, customer_id, mobile, account_name, gst_in, terms, invoice, bill_no, date, bill_date, due_date, Pricing, product_id, category, 
      metal_type, rbarcode, hsn_code,pcs, gross_weight, stone_weight, deduct_st_Wt, net_weight, purity, purityPercentage, pure_weight, wastage_on, wastage, 
      wastage_wt, Making_Charges_On, Making_Charges_Value, total_mc, total_pure_wt, paid_pure_weight, balance_pure_weight, rate, 
      total_amount, tax_slab, tax_amt, net_amt, rate_cut, rate_cut_wt, paid_amount, balance_amount, hm_charges, charges, remarks, 
      cut, color, clarity, carat_wt, stone_price, final_stone_amount, balance_after_receipt, balWt_after_payment, paid_amt, paid_wt, paid_by, bal_wt_amt,
      other_charges, Pricing, overall_taxableAmt, overall_taxAmt, overall_netAmt, overall_hmCharges, tag_id, discount_amt, final_amt, claim_remark
    FROM purchases
    WHERE invoice = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

const getAllRepairDetailsByInvoiceNumber = (invoice, callback) => {
  const sql = `SELECT * FROM purchases WHERE invoice = ?`;

  db.query(sql, [invoice], (err, results) => {
    if (err) {
      return callback(err); // Pass error to the controller
    }
    callback(null, results); // Return results to the controller
  });
};

const getAllPurchases = (callback) => {
  const query = 'SELECT * FROM purchases';
  db.query(query, (err, results) => {
    if (err) {
      // console.error('Database query error:', err);
      callback(err, null);
    } else {
      // console.log('Database query results:', results); // Debug log
      callback(null, results);
    }
  });
};

const deletePurchaseAndUpdateProduct = (id, callback) => {
  const getPurchaseDetailsQuery = `
    SELECT product_id, pcs, gross_weight 
    FROM purchases 
    WHERE id = ?`;

  const updateProductQuery = `
    UPDATE product 
  SET 
      pur_qty = pur_qty - COALESCE(?, 0), 
      pur_weight = pur_weight - COALESCE(?, 0), 
      bal_qty = pur_qty - COALESCE(sale_qty, 0), 
      bal_weight = pur_weight - COALESCE(sale_weight, 0) 
  WHERE product_id = ?`;

  const deletePurchaseQuery = `
    DELETE FROM purchases 
    WHERE id = ?`;

  db.query(getPurchaseDetailsQuery, [id], (fetchErr, purchaseResults) => {
    if (fetchErr) {
      console.error('Error fetching purchase details:', fetchErr);
      return callback(fetchErr);
    }

    if (purchaseResults.length === 0) {
      return callback(new Error('Purchase not found'));
    }

    const { product_id, pcs, gross_weight } = purchaseResults[0];

    db.query(updateProductQuery, [pcs, gross_weight, product_id], (updateErr) => {
      if (updateErr) {
        console.error('Error updating product quantities:', updateErr);
        return callback(updateErr);
      }

      db.query(deletePurchaseQuery, [id], (deleteErr, deleteResults) => {
        if (deleteErr) {
          console.error('Error deleting purchase:', deleteErr);
          return callback(deleteErr);
        }

        return callback(null, deleteResults);
      });
    });
  });
};

const deletePurchaseByInvoice = (invoice, callback) => {

  const getPurchaseDetailsQuery = `
    SELECT product_id, pcs, gross_weight 
    FROM purchases 
    WHERE invoice = ?`;

  const updateProductQuery = `
    UPDATE product 
    SET 
      pur_qty = pur_qty - COALESCE(?, 0), 
      pur_weight = pur_weight - COALESCE(?, 0), 
      bal_qty = pur_qty - COALESCE(sale_qty, 0), 
      bal_weight = pur_weight - COALESCE(sale_weight, 0) 
    WHERE product_id = ?`;

  const deletePurchaseQuery = `
    DELETE FROM purchases 
    WHERE invoice = ?`;

  db.query(getPurchaseDetailsQuery, [invoice], (fetchErr, purchaseResults) => {
    if (fetchErr) {
      console.error('Error fetching purchase details:', fetchErr);
      return callback(fetchErr);
    }

    if (purchaseResults.length === 0) {
      console.log('No purchase found for the given invoice.');
      return callback(new Error('Purchase not found'));
    }

    let updateCount = 0;
    purchaseResults.forEach(({ product_id, pcs, gross_weight }) => {

      db.query(updateProductQuery, [pcs, gross_weight, product_id], (updateErr) => {
        if (updateErr) {
          console.error("Error updating product quantities for product_id: ${product_id}, updateErr");
          return callback(updateErr);
        }

        updateCount++;
        if (updateCount === purchaseResults.length) {

          db.query(deletePurchaseQuery, [invoice], (deleteErr, deleteResults) => {
            if (deleteErr) {
              console.error('Error deleting purchase:', deleteErr);
              return callback(deleteErr);
            }
            return callback(null, deleteResults);
          });
        }
      });
    });
  });
};

const getPurchaseById = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM purchases WHERE id = ?';
    db.query(query, [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error('Purchase not found'));
      resolve(results[0]); // Return the first row
    });
  });
};

// const updatePurchase = (id, updatedData) => {
//   // Convert dates to MySQL-compatible format
//   const formatDate = (date) => {
//     if (date) {
//       // Remove the timezone and format the date to 'YYYY-MM-DD HH:MM:SS'
//       return new Date(date).toISOString().slice(0, 19).replace("T", " ");
//     }
//     return null;
//   };

//   const formattedDate = formatDate(updatedData.date);
//   const formattedBillDate = formatDate(updatedData.bill_date);
//   const formattedDueDate = formatDate(updatedData.due_date);

//   const query = `
//     UPDATE purchases 
//     SET 
//       customer_id = ?, mobile = ?, account_name = ?, gst_in = ?, terms = ?, invoice = ?, 
//       bill_no = ?, rate_cut = ?, date = ?, bill_date = ?, due_date = ?, category = ?, 
//       cut = ?, color = ?, clarity = ?, paid_pure_weight = ?, balance_pure_weight = ?, 
//       hsn_code = ?, rbarcode = ?, stone_weight = ?, net_weight = ?, hm_charges = ?, 
//       other_charges = ?, charges = ?, purity = ?, metal_type = ?, pure_weight = ?, 
//       rate = ?, total_amount = ?, paid_amount = ?, balance_amount = ?, 
//       product_id = ?, pcs = ?, gross_weight = ?, balance_after_receipt = ? , Pricing = ? , remarks = ?
//     WHERE id = ?
//   `;

//   const values = [
//     updatedData.customer_id, updatedData.mobile, updatedData.account_name, updatedData.gst_in, updatedData.terms, updatedData.invoice,
//     updatedData.bill_no, updatedData.rate_cut, formattedDate, formattedBillDate, formattedDueDate,
//     updatedData.category, updatedData.cut, updatedData.color, updatedData.clarity, updatedData.paid_pure_weight, updatedData.balance_pure_weight,
//     updatedData.hsn_code, updatedData.rbarcode, updatedData.stone_weight, updatedData.net_weight, updatedData.hm_charges,
//     updatedData.other_charges, updatedData.charges, updatedData.purity, updatedData.metal_type, updatedData.pure_weight,
//     updatedData.rate, updatedData.total_amount, updatedData.paid_amount, updatedData.balance_amount,
//     updatedData.product_id, updatedData.pcs, updatedData.gross_weight, updatedData.balance_after_receipt, updatedData.Pricing, updatedData.remarks, id
//   ];

//   return new Promise((resolve, reject) => {
//     db.query(query, values, (err, result) => {
//       if (err) return reject(err);
//       resolve(result); // Resolve with the result
//     });
//   });
// };

const updateRemark = (productId, remark, callback) => {
  const sql = "UPDATE purchases SET claim_remark = ? WHERE id = ?";
  db.query(sql, [remark, productId], callback);
};



module.exports = {
  insertPurchase,
  getAllPurchases,
  deletePurchaseAndUpdateProduct,
  deletePurchaseByInvoice,
  getPurchaseById,
  updatePurchase, // Add this function
  getAllUniqueInvoices,
  getByInvoiceNumber,
  getAllRepairDetailsByInvoiceNumber,
  insertStoneDetails,
  checkInvoiceExists,
  updateRemark
};