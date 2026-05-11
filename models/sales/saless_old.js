const db = require("./../../db");

exports.insert = (repairDetails, oldItems = [], memberSchemes = [], callback) => {
  if (!Array.isArray(repairDetails) || repairDetails.length === 0) {
    return callback(new Error("Invalid repairDetails array"));
  }

  // Precompute totals outside the map loop
  const taxableAmount = repairDetails.reduce((sum, detail) => {
    const stonePrice = parseFloat(detail.stone_price) || 0;
    const makingCharges = parseFloat(detail.making_charges) || 0;
    const rateAmt = parseFloat(detail.rate_amt) || 0;
    return sum + stonePrice + makingCharges + rateAmt;
  }, 0);

  const taxAmount = repairDetails.reduce((sum, detail) => {
    const taxAmt = parseFloat(detail.tax_amt) || 0;
    return sum + taxAmt;
  }, 0);

  const netAmount = taxableAmount + taxAmount;

   // Calculate total_old_amount for oldItems
   const totalOldAmount = oldItems.reduce((sum, item) => {
    return sum + (parseFloat(item.total_amount) || 0);
  }, 0);

  // Calculate schemes_total_amount for memberSchemes
  const schemesTotalAmount = memberSchemes.reduce((sum, scheme) => {
    return sum + (parseFloat(scheme.paid_amount) || 0);
  }, 0);

  // Map to SQL values
  const receiptsAmt = 0.0;
  const balAfterReceipts = 0.0;

  // Map to SQL values
  const values = repairDetails.map((item) => {
    const cashAmount = parseFloat(item.cash_amount) || 0;
    const cardAmount = parseFloat(item.card_amt) || 0;
    const chqAmount = parseFloat(item.chq_amt) || 0;
    const onlineAmount = parseFloat(item.online_amt) || 0;

    const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
    const netBillAmount = netAmount - (totalOldAmount + schemesTotalAmount);
    const balAmt = netBillAmount - paidAmt;
    return [
      item.customer_id || null,
      item.mobile || null,
      item.account_name || null,
      item.email || null,
      item.address1 || null,
      item.address2 || null,
      item.city || null,
      item.pincode || null,
      item.state || null,
      item.state_code || null,
      item.aadhar_card || null,
      item.gst_in || null,
      item.pan_card || null,
      item.terms || null,
      item.date || null,
      item.invoice_number || null,
      item.code || null,
      item.product_id || null,
      item.opentag_id || null,
      item.metal || null,
      item.product_name || null,
      item.metal_type || null,
      item.design_name || null,
      item.purity || null,
      item.gross_weight || null,
      item.stone_weight || null,
      item.weight_bw || null,
      item.stone_price || null,
      item.va_on || null,
      item.va_percent || null,
      item.wastage_weight || null,
      item.total_weight_av || null,
      item.mc_on || null,
      item.mc_per_gram || null,
      item.making_charges || null,
      item.rate || null,
      item.rate_amt || null,
      item.tax_percent || null,
      item.tax_amt || null,
      item.total_price || null,
      item.cash_amount || null,
      item.card_amount || null,
      item.card_amt || null,
      item.chq || null,
      item.chq_amt || null,
      item.online || null,
      item.online_amt || null,
      item.transaction_status || null,
      item.qty || null,
      item.product_image || null,
      taxableAmount,
      taxAmount,
      netAmount,
      totalOldAmount, // old_exchange_amt
      schemesTotalAmount, // scheme_amt
      receiptsAmt, // receipts_amt
      balAfterReceipts, // bal_after_receipts
      balAmt, // bal_amt
      netBillAmount, // net_bill_amount
      paidAmt, // paid_amt
    ];
  });

  const sql = `
    INSERT INTO repair_details (
      customer_id, mobile, account_name, email, address1, address2, city, 
      pincode, state, state_code, aadhar_card, gst_in, pan_card, terms, date, 
      invoice_number, code, product_id, opentag_id , metal, product_name, metal_type, design_name, purity, 
      gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, 
      wastage_weight, total_weight_av, mc_on, mc_per_gram, making_charges, rate, 
      rate_amt, tax_percent, tax_amt, total_price, cash_amount, card_amount, 
      card_amt, chq, chq_amt, online, online_amt, transaction_status, qty,product_image,
      taxable_amount, tax_amount, net_amount, old_exchange_amt, scheme_amt, receipts_amt, 
      bal_after_receipts, bal_amt, net_bill_amount, paid_amt
    ) VALUES ?`;

  db.query(sql, [values], (err, result) => {
    if (err) {
      return callback(err);
    }

    // Insert old_items if provided
    if (oldItems.length > 0) {
      const oldItemsValues = oldItems.map((item) => [
        item.id || null,
        item.invoice_id || repairDetails[0].invoice_number || null,
        item.product || null,
        item.metal || null,
        item.purity || null,
        item.hsn_code || null,
        item.gross || null,
        item.dust || null,
        item.ml_percent || null,
        item.net_wt || null,
        item.remarks || null,
        item.rate || null,
        item.total_amount || null,
        totalOldAmount,
      ]);

      const oldItemsSql = `
        INSERT INTO old_items (
          id, invoice_id, product, metal, purity, hsn_code, gross, dust, ml_percent,
          net_wt, remarks, rate, total_amount, total_old_amount
        ) VALUES ?`;

      db.query(oldItemsSql, [oldItemsValues], (oldItemsErr) => {
        if (oldItemsErr) return callback(oldItemsErr);
      });
    }

    // Insert member_schemes if provided
    if (memberSchemes.length > 0) {
      const memberSchemesValues = memberSchemes.map((scheme) => [
        scheme.id || null,
        scheme.invoice_id || repairDetails[0].invoice_number || null,
        scheme.scheme || null,
        scheme.member_name || null,
        scheme.member_number || null,
        scheme.scheme_name || null,
        scheme.installments_paid || null,
        scheme.duration_months || null,
        scheme.paid_months || null,
        scheme.pending_months || null,
        scheme.pending_amount || null,
        scheme.paid_amount || null,
        schemesTotalAmount,
      ]);

      const memberSchemesSql = `
        INSERT INTO member_schemes (
          id, invoice_id, scheme, member_name, member_number, scheme_name,
          installments_paid, duration_months, paid_months, pending_months, pending_amount,
          paid_amount, schemes_total_amount
        ) VALUES ?`;

      db.query(memberSchemesSql, [memberSchemesValues], (memberSchemesErr) => {
        if (memberSchemesErr) return callback(memberSchemesErr);
      });
    }

    // Update stock status in the opening_tags_entry table
    repairDetails.forEach((item) => {
      if (item.opentag_id) {
        const updateTagsSql = `
          UPDATE opening_tags_entry
          SET Status = 'Sold'
          WHERE opentag_id = ?`;

        db.query(updateTagsSql, [item.opentag_id], (tagsErr) => {
          if (tagsErr) return callback(tagsErr);
        });
      }
    });

    // Aggregate updates for the product table by product_id
    const aggregatedUpdates = repairDetails.reduce((acc, item) => {
      if (item.transaction_status === "Sales" && item.product_id) {
        if (!acc[item.product_id]) {
          acc[item.product_id] = { qty: 0, grossWeight: 0 };
        }
        acc[item.product_id].qty += parseFloat(item.qty) || 0;
        acc[item.product_id].grossWeight += parseFloat(item.gross_weight) || 0;
      }
      return acc;
    }, {});

    const updateQueries = Object.entries(aggregatedUpdates).map(([productId, { qty, grossWeight }]) => {
      return new Promise((resolve, reject) => {
        // Update sale_qty and sale_weight first
        const updateSaleSql = `
          UPDATE product
          SET 
            sale_qty = IFNULL(sale_qty, 0) + ?, 
            sale_weight = IFNULL(sale_weight, 0) + ?
          WHERE product_id = ?`;

        db.query(updateSaleSql, [qty, grossWeight, productId], (saleErr) => {
          if (saleErr) return reject(saleErr);

          // Then update bal_qty and bal_weight
          const updateBalanceSql = `
            UPDATE product
            SET 
              bal_qty = pur_qty - IFNULL(sale_qty, 0), 
              bal_weight = pur_weight - IFNULL(sale_weight, 0)
            WHERE product_id = ?`;

          db.query(updateBalanceSql, [productId], (balanceErr) => {
            if (balanceErr) return reject(balanceErr);
            resolve();
          });
        });
      });
    });

    // Execute all update queries
    Promise.all(updateQueries)
      .then(() => callback(null, result))
      .catch((updateErr) => callback(updateErr));
  });
};

exports.orderinsert = (repairDetails, oldItems = [], memberSchemes = [], callback) => {
  if (!Array.isArray(repairDetails) || repairDetails.length === 0) {
    return callback(new Error("Invalid repairDetails array"));
  }

  // Precompute totals outside the map loop
  const taxableAmount = repairDetails.reduce((sum, detail) => {
    const stonePrice = parseFloat(detail.stone_price) || 0;
    const makingCharges = parseFloat(detail.making_charges) || 0;
    const rateAmt = parseFloat(detail.rate_amt) || 0;
    return sum + stonePrice + makingCharges + rateAmt;
  }, 0);

  const taxAmount = repairDetails.reduce((sum, detail) => {
    const taxAmt = parseFloat(detail.tax_amt) || 0;
    return sum + taxAmt;
  }, 0);

  const netAmount = taxableAmount + taxAmount;

     // Calculate total_old_amount for oldItems
 const totalOldAmount = oldItems.reduce((sum, item) => {
  return sum + (parseFloat(item.total_amount) || 0);
}, 0);

// Calculate schemes_total_amount for memberSchemes
const schemesTotalAmount = memberSchemes.reduce((sum, scheme) => {
  return sum + (parseFloat(scheme.paid_amount) || 0);
}, 0);

  // Map to SQL values
  const receiptsAmt = 0.0;
  const balAfterReceipts = 0.0;

  // Map to SQL values
  const values = repairDetails.map((item) => {
      const cashAmount = parseFloat(item.cash_amount) || 0;
      const cardAmount = parseFloat(item.card_amt) || 0;
      const chqAmount = parseFloat(item.chq_amt) || 0;
      const onlineAmount = parseFloat(item.online_amt) || 0;
  
      const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
      const netBillAmount = netAmount - (totalOldAmount + schemesTotalAmount);
      const balAmt = netBillAmount - paidAmt;
      return [
        item.customer_id || null,
        item.mobile || null,
        item.account_name || null,
        item.email || null,
        item.address1 || null,
        item.address2 || null,
        item.city || null,
        item.pincode || null,
        item.state || null,
        item.state_code || null,
        item.aadhar_card || null,
        item.gst_in || null,
        item.pan_card || null,
        item.terms || null,
        item.date || null,
        item.invoice_number || null,
        item.code || null,
        item.product_id || null,
        item.opentag_id || null,
        item.metal || null,
        item.product_name || null,
        item.metal_type || null,
        item.design_name || null,
        item.purity || null,
        item.gross_weight || null,
        item.stone_weight || null,
        item.weight_bw || null,
        item.stone_price || null,
        item.va_on || null,
        item.va_percent || null,
        item.wastage_weight || null,
        item.total_weight_av || null,
        item.mc_on || null,
        item.mc_per_gram || null,
        item.making_charges || null,
        item.rate || null,
        item.rate_amt || null,
        item.tax_percent || null,
        item.tax_amt || null,
        item.total_price || null,
        item.cash_amount || null,
        item.card_amount || null,
        item.card_amt || null,
        item.chq || null,
        item.chq_amt || null,
        item.online || null,
        item.online_amt || null,
        item.transaction_status || null,
        item.qty || null,
        item.product_image || null,
        taxableAmount,
        taxAmount,
        netAmount,
        totalOldAmount, // old_exchange_amt
        schemesTotalAmount, // scheme_amt
        receiptsAmt, // receipts_amt
        balAfterReceipts, // bal_after_receipts
        balAmt, // bal_amt
        netBillAmount, // net_bill_amount
        paidAmt, // paid_amt
      ];
    });

    const sql = `
    INSERT INTO repair_details (
      customer_id, mobile, account_name, email, address1, address2, city, 
      pincode, state, state_code, aadhar_card, gst_in, pan_card, terms, date, 
      invoice_number, code, product_id, opentag_id , metal, product_name, metal_type, design_name, purity, 
      gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, 
      wastage_weight, total_weight_av, mc_on, mc_per_gram, making_charges, rate, 
      rate_amt, tax_percent, tax_amt, total_price, cash_amount, card_amount, 
      card_amt, chq, chq_amt, online, online_amt, transaction_status, qty,product_image,
      taxable_amount, tax_amount, net_amount, old_exchange_amt, scheme_amt, receipts_amt, 
      bal_after_receipts, bal_amt, net_bill_amount, paid_amt
    ) VALUES ?`;

  db.query(sql, [values], (err, result) => {
    if (err) {
      return callback(err);
    }

    // Insert old_items if provided
    if (oldItems.length > 0) {
      const oldItemsValues = oldItems.map((item) => [
        item.id || null,
        item.invoice_id || repairDetails[0].invoice_number || null,
        item.product || null,
        item.metal || null,
        item.purity || null,
        item.hsn_code || null,
        item.gross || null,
        item.dust || null,
        item.ml_percent || null,
        item.net_wt || null,
        item.remarks || null,
        item.rate || null,
        item.total_amount || null,
        totalOldAmount,
      ]);

      const oldItemsSql = `
      INSERT INTO old_items (
        id, invoice_id, product, metal, purity, hsn_code, gross, dust, ml_percent,
        net_wt, remarks, rate, total_amount, total_old_amount
      ) VALUES ?`;

    db.query(oldItemsSql, [oldItemsValues], (oldItemsErr) => {
      if (oldItemsErr) return callback(oldItemsErr);
    });
  }

  // Insert member_schemes if provided
  if (memberSchemes.length > 0) {
    const memberSchemesValues = memberSchemes.map((scheme) => [
      scheme.id || null,
      scheme.invoice_id || repairDetails[0].invoice_number || null,
      scheme.scheme || null,
      scheme.member_name || null,
      scheme.member_number || null,
      scheme.scheme_name || null,
      scheme.installments_paid || null,
      scheme.duration_months || null,
      scheme.paid_months || null,
      scheme.pending_months || null,
      scheme.pending_amount || null,
      scheme.paid_amount || null,
      schemesTotalAmount,
    ]);

    const memberSchemesSql = `
      INSERT INTO member_schemes (
        id, invoice_id, scheme, member_name, member_number, scheme_name,
        installments_paid, duration_months, paid_months, pending_months, pending_amount,
        paid_amount, schemes_total_amount
      ) VALUES ?`;

    db.query(memberSchemesSql, [memberSchemesValues], (memberSchemesErr) => {
      if (memberSchemesErr) return callback(memberSchemesErr);
    });
  }

    // Update stock status in the opening_tags_entry table
  //   repairDetails.forEach((item) => {
  //     if (item.opentag_id) {
  //       const updateTagsSql = `
  //         UPDATE opening_tags_entry
  //         SET Status = 'Sold'
  //         WHERE opentag_id = ?`;

  //       db.query(updateTagsSql, [item.opentag_id], (tagsErr) => {
  //         if (tagsErr) return callback(tagsErr);
  //       });
  //     }
  //   });

    // Aggregate updates for the product table by product_id
  //   const aggregatedUpdates = repairDetails.reduce((acc, item) => {
  //     if (item.transaction_status === "Sales" && item.product_id) {
  //       if (!acc[item.product_id]) {
  //         acc[item.product_id] = { qty: 0, grossWeight: 0 };
  //       }
  //       acc[item.product_id].qty += item.qty || 0;
  //       acc[item.product_id].grossWeight += item.gross_weight || 0;
  //     }
  //     return acc;
  //   }, {});

  //   const updateQueries = Object.entries(aggregatedUpdates).map(([productId, { qty, grossWeight }]) => {
  //     return new Promise((resolve, reject) => {
  //       // Update sale_qty and sale _weight first
  //       const updateSaleSql = `
  //         UPDATE product
  //         SET 
  //           sale_qty = IFNULL(sale_qty, 0) + ?, 
  //           sale_weight = IFNULL(sale_weight, 0) + ?
  //         WHERE product_id = ?`;

  //       db.query(updateSaleSql, [qty, grossWeight, productId], (saleErr) => {
  //         if (saleErr) return reject(saleErr);

  //         // Then update bal_qty and bal_weight
  //         const updateBalanceSql = `
  //           UPDATE product
  //           SET 
  //             bal_qty = pur_qty - IFNULL(sale_qty, 0), 
  //             bal_weight = pur_weight - IFNULL(sale_weight, 0)
  //           WHERE product_id = ?`;

  //         db.query(updateBalanceSql, [productId], (balanceErr) => {
  //           if (balanceErr) return reject(balanceErr);
  //           resolve();
  //         });
  //       });
  //     });
  //   });

    // Execute all update queries
    Promise.all(updateQueries)
      .then(() => callback(null, result))
      .catch((updateErr) => callback(updateErr));
  });
};

exports.getAllUniqueInvoices = (callback) => {
  const sql = `
    SELECT * 
    FROM repair_details r1
    WHERE r1.id = (
      SELECT MAX(r2.id) 
      FROM repair_details r2
      WHERE r1.invoice_number = r2.invoice_number
    )
  `;
  db.query(sql, callback);
};

exports.getByInvoiceNumber = (invoiceNumber, callback) => {
  const sql = `
    SELECT 
      code, product_id, product_image, opentag_id, metal, product_name, metal_type, design_name, purity, 
      gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, 
      wastage_weight, total_weight_av, mc_on, mc_per_gram, making_charges, rate, 
      rate_amt, tax_percent, tax_amt, total_price,
      customer_id, mobile, account_name, email, address1, address2, city, 
      pincode, state, state_code, aadhar_card, gst_in, pan_card, terms, date, 
      invoice_number, cash_amount, card_amount, card_amt, chq, chq_amt, online, 
      online_amt, transaction_status, qty, taxable_amount, tax_amount, total_price, net_amount, assigning,worker_name
    FROM repair_details
    WHERE invoice_number = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.getAllRepairDetailsByInvoiceNumber = (invoice_number, callback) => {
  const sql = `
    SELECT * FROM repair_details
    WHERE invoice_number = ?
  `;

  // Query the database
  db.query(sql, [invoice_number], (err, results) => {
    if (err) {
      return callback(err); // Pass error to the controller
    }

    callback(null, results); // Return the results to the controller
  });
};

exports.getRepairDetails = (callback) => {
  const sql = 'SELECT * FROM repair_details';
  db.query(sql, callback);
};

exports.deleteRepairDetailsByInvoice = (invoiceNumber, callback) => {
  const sql = `
    DELETE FROM repair_details
    WHERE invoice_number = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.updateStatus = (invoice_number, order_status) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE repair_details SET order_status = ? WHERE invoice_number = ?
    `;
    const values = [order_status, invoice_number];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating order status:', err);
        return reject(new Error('Database error'));
      }

      // Check if any rows were affected
      resolve(result.affectedRows > 0);
    });
  });
};








const db = require("./../../db");

exports.orderinsert = (repairDetails, oldItems = [], memberSchemes = [], callback) => {
  if (!Array.isArray(repairDetails) || repairDetails.length === 0) {
    return callback(new Error("Invalid repairDetails array"));
  }

  // Precompute totals outside the map loop
  const taxableAmount = repairDetails.reduce((sum, detail) => {
    const stonePrice = parseFloat(detail.stone_price) || 0;
    const makingCharges = parseFloat(detail.making_charges) || 0;
    const rateAmt = parseFloat(detail.rate_amt) || 0;
    return sum + stonePrice + makingCharges + rateAmt;
  }, 0);

  const taxAmount = repairDetails.reduce((sum, detail) => {
    const taxAmt = parseFloat(detail.tax_amt) || 0;
    return sum + taxAmt;
  }, 0);

  const netAmount = taxableAmount + taxAmount;

  // Calculate total_old_amount for oldItems
  const totalOldAmount = oldItems.reduce((sum, item) => {
    return sum + (parseFloat(item.total_amount) || 0);
  }, 0);

  // Calculate schemes_total_amount for memberSchemes
  const schemesTotalAmount = memberSchemes.reduce((sum, scheme) => {
    return sum + (parseFloat(scheme.paid_amount) || 0);
  }, 0);

  // Map to SQL values
  const receiptsAmt = 0.0;
  const balAfterReceipts = 0.0;

  // Map to SQL values
  const values = repairDetails.map((item) => {
    const cashAmount = parseFloat(item.cash_amount) || 0;
    const cardAmount = parseFloat(item.card_amt) || 0;
    const chqAmount = parseFloat(item.chq_amt) || 0;
    const onlineAmount = parseFloat(item.online_amt) || 0;

    const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
    const netBillAmount = netAmount - (totalOldAmount + schemesTotalAmount);
    const balAmt = netBillAmount - paidAmt;
    
    return [
      item.customer_id || null,
      item.mobile || null,
      item.account_name || null,
      item.email || null,
      item.address1 || null,
      item.address2 || null,
      item.city || null,
      item.pincode || null,
      item.state || null,
      item.state_code || null,
      item.aadhar_card || null,
      item.gst_in || null,
      item.pan_card || null,
      item.terms || null,
      item.date || null,
      item.invoice_number || null,
      item.code || null,
      item.product_id || null,
      item.opentag_id || null,
      item.metal || null,
      item.product_name || null,
      item.metal_type || null,
      item.design_name || null,
      item.purity || null,
      item.gross_weight || null,
      item.stone_weight || null,
      item.weight_bw || null,
      item.stone_price || null,
      item.va_on || null,
      item.va_percent || null,
      item.wastage_weight || null,
      item.total_weight_av || null,
      item.mc_on || null,
      item.mc_per_gram || null,
      item.making_charges || null,
      item.rate || null,
      item.rate_amt || null,
      item.tax_percent || null,
      item.tax_amt || null,
      item.total_price || null,
      item.cash_amount || null,
      item.card_amount || null,
      item.card_amt || null,
      item.chq || null,
      item.chq_amt || null,
      item.online || null,
      item.online_amt || null,
      item.transaction_status || null,
      item.qty || null,
      item.product_image || null,
      taxableAmount,
      taxAmount,
      netAmount,
      totalOldAmount, // old_exchange_amt
      schemesTotalAmount, // scheme_amt
      receiptsAmt, // receipts_amt
      balAfterReceipts, // bal_after_receipts
      balAmt, // bal_amt
      netBillAmount, // net_bill_amount
      paidAmt, // paid_amt
    ];
  });

  const sql = `
    INSERT INTO repair_details (
      customer_id, mobile, account_name, email, address1, address2, city, 
      pincode, state, state_code, aadhar_card, gst_in, pan_card, terms, date, 
      invoice_number, code, product_id, opentag_id, metal, product_name, metal_type, design_name, purity, 
      gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, 
      wastage_weight, total_weight_av, mc_on, mc_per_gram, making_charges, rate, 
      rate_amt, tax_percent, tax_amt, total_price, cash_amount, card_amount, 
      card_amt, chq, chq_amt, online, online_amt, transaction_status, qty, product_image,
      taxable_amount, tax_amount, net_amount, old_exchange_amt, scheme_amt, receipts_amt, 
      bal_after_receipts, bal_amt, net_bill_amount, paid_amt
    ) VALUES ?`;

  db.query(sql, [values], (err, result) => {
    if (err) {
      return callback(err);
    }

    // Create an array to store all database operations
    const dbOperations = [];

    // Insert old_items if provided
    if (oldItems.length > 0) {
      const oldItemsValues = oldItems.map((item) => [
        item.id || null,
        item.invoice_id || repairDetails[0].invoice_number || null,
        item.product || null,
        item.metal || null,
        item.purity || null,
        item.hsn_code || null,
        item.gross || null,
        item.dust || null,
        item.ml_percent || null,
        item.net_wt || null,
        item.remarks || null,
        item.rate || null,
        item.total_amount || null,
        totalOldAmount,
      ]);

      const oldItemsSql = `
        INSERT INTO old_items (
          id, invoice_id, product, metal, purity, hsn_code, gross, dust, ml_percent,
          net_wt, remarks, rate, total_amount, total_old_amount
        ) VALUES ?`;

      dbOperations.push(
        new Promise((resolve, reject) => {
          db.query(oldItemsSql, [oldItemsValues], (err) => {
            if (err) reject(err);
            else resolve();
          });
        })
      );
    }

    // Insert member_schemes if provided
    if (memberSchemes.length > 0) {
      const memberSchemesValues = memberSchemes.map((scheme) => [
        scheme.id || null,
        scheme.invoice_id || repairDetails[0].invoice_number || null,
        scheme.scheme || null,
        scheme.member_name || null,
        scheme.member_number || null,
        scheme.scheme_name || null,
        scheme.installments_paid || null,
        scheme.duration_months || null,
        scheme.paid_months || null,
        scheme.pending_months || null,
        scheme.pending_amount || null,
        scheme.paid_amount || null,
        schemesTotalAmount,
      ]);

      const memberSchemesSql = `
        INSERT INTO member_schemes (
          id, invoice_id, scheme, member_name, member_number, scheme_name,
          installments_paid, duration_months, paid_months, pending_months, pending_amount,
          paid_amount, schemes_total_amount
        ) VALUES ?`;

      dbOperations.push(
        new Promise((resolve, reject) => {
          db.query(memberSchemesSql, [memberSchemesValues], (err) => {
            if (err) reject(err);
            else resolve();
          });
        })
      );
    }

    // Execute all database operations
    Promise.all(dbOperations)
      .then(() => callback(null, result))
      .catch((error) => callback(error));
  });
};


exports.insert = (repairDetails, oldItems = [], memberSchemes = [], callback) => {
  if (!Array.isArray(repairDetails) || repairDetails.length === 0) {
    return callback(new Error("Invalid repairDetails array"));
  }

  // Precompute totals outside the map loop
  const taxableAmount = repairDetails.reduce((sum, detail) => {
    const stonePrice = parseFloat(detail.stone_price) || 0;
    const makingCharges = parseFloat(detail.making_charges) || 0;
    const rateAmt = parseFloat(detail.rate_amt) || 0;
    return sum + stonePrice + makingCharges + rateAmt;
  }, 0);

  const taxAmount = repairDetails.reduce((sum, detail) => {
    const taxAmt = parseFloat(detail.tax_amt) || 0;
    return sum + taxAmt;
  }, 0);

  const netAmount = taxableAmount + taxAmount;

   // Calculate total_old_amount for oldItems
   const totalOldAmount = oldItems.reduce((sum, item) => {
    return sum + (parseFloat(item.total_amount) || 0);
  }, 0);

  // Calculate schemes_total_amount for memberSchemes
  const schemesTotalAmount = memberSchemes.reduce((sum, scheme) => {
    return sum + (parseFloat(scheme.paid_amount) || 0);
  }, 0);

  // Map to SQL values
  const receiptsAmt = 0.0;
  const balAfterReceipts = 0.0;

  // Map to SQL values
  const values = repairDetails.map((item) => {
    const cashAmount = parseFloat(item.cash_amount) || 0;
    const cardAmount = parseFloat(item.card_amt) || 0;
    const chqAmount = parseFloat(item.chq_amt) || 0;
    const onlineAmount = parseFloat(item.online_amt) || 0;

    const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
    const netBillAmount = netAmount - (totalOldAmount + schemesTotalAmount);
    const balAmt = netBillAmount - paidAmt;
    return [
      item.customer_id || null,
      item.mobile || null,
      item.account_name || null,
      item.email || null,
      item.address1 || null,
      item.address2 || null,
      item.city || null,
      item.pincode || null,
      item.state || null,
      item.state_code || null,
      item.aadhar_card || null,
      item.gst_in || null,
      item.pan_card || null,
      item.terms || null,
      item.date || null,
      item.invoice_number || null,
      item.code || null,
      item.product_id || null,
      item.opentag_id || null,
      item.metal || null,
      item.product_name || null,
      item.metal_type || null,
      item.design_name || null,
      item.purity || null,
      item.gross_weight || null,
      item.stone_weight || null,
      item.weight_bw || null,
      item.stone_price || null,
      item.va_on || null,
      item.va_percent || null,
      item.wastage_weight || null,
      item.total_weight_av || null,
      item.mc_on || null,
      item.mc_per_gram || null,
      item.making_charges || null,
      item.rate || null,
      item.rate_amt || null,
      item.tax_percent || null,
      item.tax_amt || null,
      item.total_price || null,
      item.cash_amount || null,
      item.card_amount || null,
      item.card_amt || null,
      item.chq || null,
      item.chq_amt || null,
      item.online || null,
      item.online_amt || null,
      item.transaction_status || null,
      item.qty || null,
      item.product_image || null,
      taxableAmount,
      taxAmount,
      netAmount,
      totalOldAmount, // old_exchange_amt
      schemesTotalAmount, // scheme_amt
      receiptsAmt, // receipts_amt
      balAfterReceipts, // bal_after_receipts
      balAmt, // bal_amt
      netBillAmount, // net_bill_amount
      paidAmt, // paid_amt
    ];
  });

  const sql = `
    INSERT INTO repair_details (
      customer_id, mobile, account_name, email, address1, address2, city, 
      pincode, state, state_code, aadhar_card, gst_in, pan_card, terms, date, 
      invoice_number, code, product_id, opentag_id , metal, product_name, metal_type, design_name, purity, 
      gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, 
      wastage_weight, total_weight_av, mc_on, mc_per_gram, making_charges, rate, 
      rate_amt, tax_percent, tax_amt, total_price, cash_amount, card_amount, 
      card_amt, chq, chq_amt, online, online_amt, transaction_status, qty,product_image,
      taxable_amount, tax_amount, net_amount, old_exchange_amt, scheme_amt, receipts_amt, 
      bal_after_receipts, bal_amt, net_bill_amount, paid_amt
    ) VALUES ?`;

  db.query(sql, [values], (err, result) => {
    if (err) {
      return callback(err);
    }

    // Insert old_items if provided
    if (oldItems.length > 0) {
      const oldItemsValues = oldItems.map((item) => [
        item.id || null,
        item.invoice_id || repairDetails[0].invoice_number || null,
        item.product || null,
        item.metal || null,
        item.purity || null,
        item.hsn_code || null,
        item.gross || null,
        item.dust || null,
        item.ml_percent || null,
        item.net_wt || null,
        item.remarks || null,
        item.rate || null,
        item.total_amount || null,
        totalOldAmount,
      ]);

      const oldItemsSql = `
        INSERT INTO old_items (
          id, invoice_id, product, metal, purity, hsn_code, gross, dust, ml_percent,
          net_wt, remarks, rate, total_amount, total_old_amount
        ) VALUES ?`;

      db.query(oldItemsSql, [oldItemsValues], (oldItemsErr) => {
        if (oldItemsErr) return callback(oldItemsErr);
      });
    }

    // Insert member_schemes if provided
    if (memberSchemes.length > 0) {
      const memberSchemesValues = memberSchemes.map((scheme) => [
        scheme.id || null,
        scheme.invoice_id || repairDetails[0].invoice_number || null,
        scheme.scheme || null,
        scheme.member_name || null,
        scheme.member_number || null,
        scheme.scheme_name || null,
        scheme.installments_paid || null,
        scheme.duration_months || null,
        scheme.paid_months || null,
        scheme.pending_months || null,
        scheme.pending_amount || null,
        scheme.paid_amount || null,
        schemesTotalAmount,
      ]);

      const memberSchemesSql = `
        INSERT INTO member_schemes (
          id, invoice_id, scheme, member_name, member_number, scheme_name,
          installments_paid, duration_months, paid_months, pending_months, pending_amount,
          paid_amount, schemes_total_amount
        ) VALUES ?`;

      db.query(memberSchemesSql, [memberSchemesValues], (memberSchemesErr) => {
        if (memberSchemesErr) return callback(memberSchemesErr);
      });
    }

    // Update stock status in the opening_tags_entry table
    repairDetails.forEach((item) => {
      if (item.opentag_id) {
        const updateTagsSql = `
          UPDATE opening_tags_entry
          SET Status = 'Sold'
          WHERE opentag_id = ?`;

        db.query(updateTagsSql, [item.opentag_id], (tagsErr) => {
          if (tagsErr) return callback(tagsErr);
        });
      }
    });

    // Aggregate updates for the product table by product_id
    const aggregatedUpdates = repairDetails.reduce((acc, item) => {
      if (item.transaction_status === "Sales" && item.product_id) {
        if (!acc[item.product_id]) {
          acc[item.product_id] = { qty: 0, grossWeight: 0 };
        }
        acc[item.product_id].qty += parseFloat(item.qty) || 0;
        acc[item.product_id].grossWeight += parseFloat(item.gross_weight) || 0;
      }
      return acc;
    }, {});

    const updateQueries = Object.entries(aggregatedUpdates).map(([productId, { qty, grossWeight }]) => {
      return new Promise((resolve, reject) => {
        // Update sale_qty and sale_weight first
        const updateSaleSql = `
          UPDATE product
          SET 
            sale_qty = IFNULL(sale_qty, 0) + ?, 
            sale_weight = IFNULL(sale_weight, 0) + ?
          WHERE product_id = ?`;

        db.query(updateSaleSql, [qty, grossWeight, productId], (saleErr) => {
          if (saleErr) return reject(saleErr);

          // Then update bal_qty and bal_weight
          const updateBalanceSql = `
            UPDATE product
            SET 
              bal_qty = pur_qty - IFNULL(sale_qty, 0), 
              bal_weight = pur_weight - IFNULL(sale_weight, 0)
            WHERE product_id = ?`;

          db.query(updateBalanceSql, [productId], (balanceErr) => {
            if (balanceErr) return reject(balanceErr);
            resolve();
          });
        });
      });
    });

    // Execute all update queries
    Promise.all(updateQueries)
      .then(() => callback(null, result))
      .catch((updateErr) => callback(updateErr));
  });
};



exports.getAllUniqueInvoices = (callback) => {
  const sql = `
    SELECT * 
    FROM repair_details r1
    WHERE r1.id = (
      SELECT MAX(r2.id) 
      FROM repair_details r2
      WHERE r1.invoice_number = r2.invoice_number
    )
  `;
  db.query(sql, callback);
};

exports.getByInvoiceNumber = (invoiceNumber, callback) => {
  const sql = `
    SELECT 
      code, product_id, product_image, opentag_id, metal, product_name, metal_type, design_name, purity, 
      gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, 
      wastage_weight, total_weight_av, mc_on, mc_per_gram, making_charges, rate, 
      rate_amt, tax_percent, tax_amt, total_price,
      customer_id, mobile, account_name, email, address1, address2, city, 
      pincode, state, state_code, aadhar_card, gst_in, pan_card, terms, date, 
      invoice_number, cash_amount, card_amount, card_amt, chq, chq_amt, online, 
      online_amt, transaction_status, qty, taxable_amount, tax_amount, total_price, net_amount, assigning,worker_name
    FROM repair_details
    WHERE invoice_number = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.getAllRepairDetailsByInvoiceNumber = (invoice_number, callback) => {
  const sql = `
    SELECT * FROM repair_details
    WHERE invoice_number = ?
  `;

  // Query the database
  db.query(sql, [invoice_number], (err, results) => {
    if (err) {
      return callback(err); // Pass error to the controller
    }

    callback(null, results); // Return the results to the controller
  });
};

exports.getRepairDetails = (callback) => {
  const sql = 'SELECT * FROM repair_details';
  db.query(sql, callback);
};

exports.deleteRepairDetailsByInvoice = (invoiceNumber, callback) => {
  const sql = `
    DELETE FROM repair_details
    WHERE invoice_number = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.updateStatus = (invoice_number, order_status) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE repair_details SET order_status = ? WHERE invoice_number = ?
    `;
    const values = [order_status, invoice_number];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating order status:', err);
        return reject(new Error('Database error'));
      }

      // Check if any rows were affected
      resolve(result.affectedRows > 0);
    });
  });
};



