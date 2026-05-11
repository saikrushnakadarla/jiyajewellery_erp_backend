const db = require("./../../db");

exports.orderinsert = (orderDetails, oldItems = [], memberSchemes = [], salesNetAmount, advanceAmount, customerImage, callback) => {
  if (!Array.isArray(orderDetails) || orderDetails.length === 0) {
    return callback(new Error("Invalid orderDetails array"));
  }

  let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let originalOrderNumber = orderDetails[0].order_number;

  const padNumber = (num, size) => {
    let s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
  };

  const getNextOrderNumber = (prefix, currentMaxNumber) => {
    const nextNumber = parseInt(currentMaxNumber) + 1;
    return `${prefix}${padNumber(nextNumber, 3)}`;
  };

  const orderRegex = /^([A-Za-z]+)(\d+)$/;
  const match = originalOrderNumber.match(orderRegex);

  if (!match) {
    return callback(new Error("Invalid invoice number format"));
  }

  const prefix = match[1];
  const currentNumber = parseInt(match[2]);

  const orderCheckSql = `SELECT order_number FROM repair_details WHERE order_number LIKE '${prefix}%'`;

  // Function to process customer details before order insertion
  const processCustomerDetails = (callback) => {
    const customerPromises = orderDetails.map(item => {
      return new Promise((resolve, reject) => {
        if (!item.mobile) {
          // If no mobile number, just proceed with null customer_id
          resolve(null);
          return;
        }

        const checkCustomerSql = `SELECT account_id FROM account_details WHERE mobile = ?`;
        db.query(checkCustomerSql, [item.mobile], (err, results) => {
          if (err) return reject(err);

          if (results.length > 0) {
            // Customer exists, use existing account_id
            item.customer_id = results[0].account_id;
            resolve(item.customer_id);
          } else {
            // Customer doesn't exist, insert new record
            const insertCustomerSql = `
              INSERT INTO account_details (
                account_name, mobile, email, address1, address2, 
                city, pincode, state, state_code, aadhar_card, 
                gst_in, pan_card, account_group
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const customerParams = [
              item.account_name || null,
              item.mobile,
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
              'CUSTOMERS'
            ];

            db.query(insertCustomerSql, customerParams, (insertErr, insertResult) => {
              if (insertErr) return reject(insertErr);
              item.customer_id = insertResult.insertId;
              resolve(item.customer_id);
            });
          }
        });
      });
    });

    Promise.all(customerPromises)
      .then(() => callback(null))
      .catch(err => callback(err));
  };

  // First process customer details
  processCustomerDetails((err) => {
    if (err) return callback(err);

    // Continue with the rest of the order processing
    db.query(orderCheckSql, (err, rows) => {
      if (err) return callback(err);

      let maxNumber = currentNumber;

      rows.forEach(row => {
        const rowMatch = row.order_number.match(orderRegex);
        if (rowMatch && rowMatch[1] === prefix) {
          const num = parseInt(rowMatch[2]);
          if (num >= maxNumber) {
            maxNumber = num;
          }
        }
      });

      let newOrderNumber;
      const exists = rows.some(r => r.order_number === originalOrderNumber);

      if (exists) {
        newOrderNumber = getNextOrderNumber(prefix, maxNumber);
      } else {
        newOrderNumber = originalOrderNumber;
      }

      // Now proceed with order insertion after customer processing is complete

      // Precompute totals outside the map loop
      const taxableAmount = orderDetails.reduce((sum, item) => {
        const stonePrice = parseFloat(item.stone_price) || 0;
        const makingCharges = parseFloat(item.making_charges) || 0;
        const rateAmt = parseFloat(item.rate_amt) || 0;
        const hmCharges = parseFloat(item.hm_charges) || 0;
        const discountAmt = parseFloat(item.disscount) || 0;
        return sum + stonePrice + makingCharges + rateAmt + hmCharges - discountAmt;
      }, 0);

      const taxAmount = orderDetails.reduce((sum, item) => sum + parseFloat(item.tax_amt || 0), 0);
      const netAmount = taxableAmount + taxAmount;

      // Calculate total_old_amount for oldItems
      const totalOldAmount = oldItems.reduce((sum, item) => {
        return sum + (parseFloat(item.total_amount) || 0);
      }, 0);

      // Calculate schemes_total_amount for memberSchemes
      const schemesTotalAmount = memberSchemes.reduce((sum, scheme) => {
        return sum + (parseFloat(scheme.paid_amount) || 0);
      }, 0);

      const parsedSalesNetAmount = parseFloat(salesNetAmount) || 0;
      const parsedAdvanceAmount = parseFloat(advanceAmount) || 0;

      // Map to SQL values
      const receiptsAmt = 0.0;
      const balAfterReceipts = 0.0;

      const sanitizeNumeric = (value) => {
        if (value === null || value === undefined || value === 'NaN') return 0;
        const num = parseFloat(value.toString().replace(/[^\d.]/g, ""));
        return isNaN(num) ? 0 : num;
      };

      // Check if we should update existing records or insert new ones
      const checkExistingSql = `SELECT id FROM repair_details WHERE id IN (?)`;
      const existingIds = orderDetails.map(item => item.id).filter(id => id);

      if (existingIds.length > 0) {
        db.query(checkExistingSql, [existingIds], (err, existingRows) => {
          if (err) return callback(err);

          const existingIdsSet = new Set(existingRows.map(row => row.id));
          const itemsToInsert = [];
          const itemsToUpdate = [];

          orderDetails.forEach(item => {
            if (item.id && existingIdsSet.has(item.id)) {
              itemsToUpdate.push(item);
            } else {
              itemsToInsert.push(item);
            }
          });

          // Process updates first - use original invoice number for updates
          const updatePromises = itemsToUpdate.map(item => {
            return new Promise((resolve, reject) => {
              const cashAmount = parseFloat(item.cash_amount) || 0;
              const cardAmount = parseFloat(item.card_amt) || 0;
              const chqAmount = parseFloat(item.chq_amt) || 0;
              const onlineAmount = parseFloat(item.online_amt) || 0;

              const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
              const netBillAmount = netAmount - (totalOldAmount + schemesTotalAmount + parsedSalesNetAmount + parsedAdvanceAmount);
              const roundedNetBillAmount = Math.round(netBillAmount);
              const balAmt = roundedNetBillAmount - paidAmt;

              const updateSql = `
                UPDATE repair_details SET
                  customer_id = ?,
                  mobile = ?,
                  account_name = ?,
                  email = ?,
                  address1 = ?,
                  address2 = ?,
                  city = ?,
                  pincode = ?,
                  state = ?,
                  state_code = ?,
                  aadhar_card = ?,
                  gst_in = ?,
                  pan_card = ?,
                  terms = ?,
                  date = ?,
                  time = ?,
                  code = ?,
                  product_id = ?,
                  opentag_id = ?,
                  metal = ?,
                  product_name = ?,
                  metal_type = ?,
                  design_name = ?,
                  purity = ?,               
                  selling_purity = ?,
                  printing_purity = ?,
                  custom_purity = ?,
                  pricing = ?,
                  category = ?,
                  sub_category = ?,
                  gross_weight = ?,
                  stone_weight = ?,
                  weight_bw = ?,
                  stone_price = ?,
                  va_on = ?,
                  va_percent = ?,
                  wastage_weight = ?,
                  total_weight_av = ?,
                  mc_on = ?,
                  mc_per_gram = ?,
                  making_charges = ?,
                  disscount_percentage = ?,
                  disscount = ?,
                  festival_discount = ?,
                  rate = ?,
                  rate_24k = ?,
                  pieace_cost = ?,
                  mrp_price = ?,
                  rate_amt = ?,
                  tax_percent = ?,
                  tax_amt = ?,
                  original_total_price = ?,
                  total_price = ?,
                  cash_amount = ?,
                  card_amount = ?,
                  card_amt = ?,
                  chq = ?,
                  chq_amt = ?,
                  online = ?,
                  online_amt = ?,
                  transaction_status = ?,
                  qty = ?,
                  product_image = COALESCE(?, product_image),
                  imagePreview = ?,
                  invoice_number = ?,
                  invoice = ?,
                  hm_charges = ?,
                  remarks = ?,
                  sale_status = ?,
                  taxable_amount = ?,
                  tax_amount = ?,
                  net_amount = ?,
                  old_exchange_amt = ?,
                  scheme_amt = ?,
                  sale_return_amt = ?,
                  advance_amt = ?,
                  receipts_amt = ?,
                  bal_after_receipts = ?,
                  bal_amt = ?,
                  net_bill_amount = ?,
                  paid_amt = ?,
                  piece_taxable_amt = ?,
                  original_piece_taxable_amt = ?,
                  customerImage = ?,
                  size = ?,
                WHERE id = ?`;

              const updateParams = [
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
                item.time || currentTime,
                item.code || null,
                item.product_id || null,
                item.opentag_id || null,
                item.metal || null,
                item.product_name || null,
                item.metal_type || null,
                item.design_name || null,
                item.purity || null,
                item.selling_purity || null,
                item.printing_purity || null,
                item.custom_purity || null,
                item.pricing || null,
                item.category || null,
                item.sub_category || null,
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
                item.disscount_percentage || null,
                item.disscount || null,
                item.festival_discount || null,
                item.rate || null,
                item.rate_24k || null,
                item.pieace_cost || null,
                item.mrp_price || null,
                item.rate_amt || null,
                sanitizeNumeric(item.tax_percent),
                item.tax_amt || null,
                item.original_total_price || null,
                item.total_price || null,
                item.cash_amount || null,
                item.card_amount || null,
                item.card_amt || null,
                item.chq || null,
                item.chq_amt || null,
                item.online || null,
                item.online_amt || null,
                item.transaction_status || "Orders",
                item.qty || null,
                item.product_image || null,
                item.imagePreview || null,
                item.invoice_number || null,
                item.invoice || null,
                item.hm_charges || null,
                item.remarks || null,
                item.sale_status || null,
                taxableAmount,
                taxAmount,
                netAmount,
                totalOldAmount,
                schemesTotalAmount,
                parsedSalesNetAmount,
                parsedAdvanceAmount,
                receiptsAmt,
                balAfterReceipts,
                balAmt,
                roundedNetBillAmount,
                paidAmt,
                sanitizeNumeric(item.piece_taxable_amt),
                sanitizeNumeric(item.original_piece_taxable_amt),
                customerImage,
                item.size || null,
                item.id
              ];

              db.query(updateSql, updateParams, (updateErr) => {
                if (updateErr) return reject(updateErr);
                resolve();
              });
            });
          });

          // Then process inserts - use new invoice number for inserts
          const insertValues = itemsToInsert.map((item) => {
            const cashAmount = parseFloat(item.cash_amount) || 0;
            const cardAmount = parseFloat(item.card_amt) || 0;
            const chqAmount = parseFloat(item.chq_amt) || 0;
            const onlineAmount = parseFloat(item.online_amt) || 0;

            const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
            const netBillAmount = netAmount - (totalOldAmount + schemesTotalAmount + parsedSalesNetAmount + parsedAdvanceAmount);
            const roundedNetBillAmount = Math.round(netBillAmount);
            const balAmt = roundedNetBillAmount - paidAmt;

            return [
              item.id || null,
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
              currentTime,
              item.invoice_number || null, // Using new invoice number for inserts
              item.code || null,
              item.product_id || null,
              item.opentag_id || null,
              item.metal || null,
              item.product_name || null,
              item.metal_type || null,
              item.design_name || null,
              item.purity || null,
              item.selling_purity || null,
              item.printing_purity || null,
              item.custom_purity || null,
              item.pricing || null,
              item.category || null,
              item.sub_category || null,
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
              item.disscount_percentage || null,
              item.disscount || null,
              item.festival_discount || null,
              item.rate || null,
              item.rate_24k || null,
              item.pieace_cost || null,
              item.mrp_price || null,
              item.rate_amt || null,
              sanitizeNumeric(item.tax_percent),
              item.tax_amt || null,
              item.original_total_price || null,
              item.total_price || null,
              item.cash_amount || null,
              item.card_amount || null,
              item.card_amt || null,
              item.chq || null,
              item.chq_amt || null,
              item.online || null,
              item.online_amt || null,
              item.transaction_status || "Orders",
              item.qty || null,
              item.product_image || null,
              item.imagePreview || null,
              newOrderNumber,
              item.invoice || null,
              item.hm_charges || null,
              item.remarks || null,
              item.sale_status || null,
              taxableAmount,
              taxAmount,
              netAmount,
              totalOldAmount,
              schemesTotalAmount,
              parsedSalesNetAmount,
              parsedAdvanceAmount,
              receiptsAmt,
              balAfterReceipts,
              balAmt,
              roundedNetBillAmount,
              paidAmt,
              sanitizeNumeric(item.piece_taxable_amt),
              sanitizeNumeric(item.original_piece_taxable_amt),
              customerImage,
              item.size,
            ];
          });

          const insertSql = `
            INSERT INTO repair_details (
              id, customer_id, mobile, account_name, email, address1, address2, city, pincode, state, state_code, 
              aadhar_card, gst_in, pan_card, terms, date,time, invoice_number, code, product_id, opentag_id, metal, 
              product_name, metal_type, design_name, purity, selling_purity, printing_purity,custom_purity, pricing, category, sub_category, 
              gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, wastage_weight, total_weight_av, 
              mc_on, mc_per_gram, making_charges, disscount_percentage, disscount,festival_discount, rate, rate_24k, pieace_cost, mrp_price, 
              rate_amt, tax_percent, tax_amt, original_total_price, total_price, cash_amount, card_amount, card_amt, 
              chq, chq_amt, online, online_amt, transaction_status, qty, product_image, imagePreview, order_number, 
              invoice, hm_charges, remarks, sale_status, taxable_amount, tax_amount, net_amount, old_exchange_amt, 
              scheme_amt, sale_return_amt, advance_amt, receipts_amt, bal_after_receipts, bal_amt, net_bill_amount, paid_amt, 
              piece_taxable_amt, original_piece_taxable_amt, customerImage, size
            ) VALUES ?`;

          // Execute all operations
          Promise.all(updatePromises)
            .then(() => {
              if (insertValues.length > 0) {
                db.query(insertSql, [insertValues], (insertErr, insertResult) => {
                  if (insertErr) return callback(insertErr);
                  processRelatedTables(newOrderNumber, callback);
                });
              } else {
                // For updates only, use the original invoice number in related tables
                processRelatedTables(originalOrderNumber, callback);
              }
            })
            .catch(err => callback(err));
        });
      } else {
        // No existing IDs, proceed with insert only - use new invoice number
        const insertValues = orderDetails.map((item) => {
          const cashAmount = parseFloat(item.cash_amount) || 0;
          const cardAmount = parseFloat(item.card_amt) || 0;
          const chqAmount = parseFloat(item.chq_amt) || 0;
          const onlineAmount = parseFloat(item.online_amt) || 0;

          const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
          const netBillAmount = netAmount - (totalOldAmount + schemesTotalAmount + parsedSalesNetAmount);
          const roundedNetBillAmount = Math.round(netBillAmount);
          const balAmt = roundedNetBillAmount - paidAmt;

          return [
            item.id || null,
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
            currentTime,
            item.invoice_number || null, // Using new invoice number for inserts
            item.code || null,
            item.product_id || null,
            item.opentag_id || null,
            item.metal || null,
            item.product_name || null,
            item.metal_type || null,
            item.design_name || null,
            item.purity || null,
            item.selling_purity || null,
            item.printing_purity || null,
            item.custom_purity || null,
            item.pricing || null,
            item.category || null,
            item.sub_category || null,
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
            item.disscount_percentage || null,
            item.disscount || null,
            item.festival_discount || null,
            item.rate || null,
            item.rate_24k || null,
            item.pieace_cost || null,
            item.mrp_price || null,
            item.rate_amt || null,
            sanitizeNumeric(item.tax_percent),
            item.tax_amt || null,
            item.original_total_price || null,
            item.total_price || null,
            item.cash_amount || null,
            item.card_amount || null,
            item.card_amt || null,
            item.chq || null,
            item.chq_amt || null,
            item.online || null,
            item.online_amt || null,
            item.transaction_status || "Orders",
            item.qty || null,
            item.product_image || null,
            item.imagePreview || null,
            newOrderNumber,
            item.invoice || null,
            item.hm_charges || null,
            item.remarks || null,
            item.sale_status || null,
            taxableAmount,
            taxAmount,
            netAmount,
            totalOldAmount,
            schemesTotalAmount,
            parsedSalesNetAmount,
            parsedAdvanceAmount,
            receiptsAmt,
            balAfterReceipts,
            balAmt,
            roundedNetBillAmount,
            paidAmt,
            sanitizeNumeric(item.piece_taxable_amt),
            sanitizeNumeric(item.original_piece_taxable_amt),
            customerImage,
            item.size || null
          ];
        });

        const insertSql = `
          INSERT INTO repair_details (
            id, customer_id, mobile, account_name, email, address1, address2, city, pincode, state, state_code, 
            aadhar_card, gst_in, pan_card, terms, date,time, invoice_number, code, product_id, opentag_id, metal, 
            product_name, metal_type, design_name, purity, selling_purity, printing_purity, custom_purity, pricing, category, sub_category, 
            gross_weight, stone_weight, weight_bw, stone_price, va_on, va_percent, wastage_weight, total_weight_av, 
            mc_on, mc_per_gram, making_charges, disscount_percentage, disscount, festival_discount, rate, rate_24k, pieace_cost, mrp_price, 
            rate_amt, tax_percent, tax_amt, original_total_price, total_price, cash_amount, card_amount, card_amt, 
            chq, chq_amt, online, online_amt, transaction_status, qty, product_image, imagePreview, order_number, 
            invoice, hm_charges, remarks, sale_status, taxable_amount, tax_amount, net_amount, old_exchange_amt, 
            scheme_amt, sale_return_amt, advance_amt, receipts_amt, bal_after_receipts, bal_amt, net_bill_amount, paid_amt, 
            piece_taxable_amt,original_piece_taxable_amt, customerImage, size
          ) VALUES ?`;

        db.query(insertSql, [insertValues], (insertErr, insertResult) => {
          if (insertErr) return callback(insertErr);
          processRelatedTables(newOrderNumber, callback);
        });
      }
      function processRelatedTables(orderNumber, callback) {
        // Insert old_items if provided
        if (oldItems.length > 0) {
          const oldItemsValues = oldItems.map((item) => [
            item.id || null,
            orderNumber,
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
          ) VALUES ?
          ON DUPLICATE KEY UPDATE
            invoice_id = VALUES(invoice_id),
            product = VALUES(product),
            metal = VALUES(metal),
            purity = VALUES(purity),
            hsn_code = VALUES(hsn_code),
            gross = VALUES(gross),
            dust = VALUES(dust),
            ml_percent = VALUES(ml_percent),
            net_wt = VALUES(net_wt),
            remarks = VALUES(remarks),
            rate = VALUES(rate),
            total_amount = VALUES(total_amount),
            total_old_amount = VALUES(total_old_amount);
        `;

          db.query(oldItemsSql, [oldItemsValues], (oldItemsErr) => {
            if (oldItemsErr) return callback(oldItemsErr);
          });
        }

        // Insert member_schemes if provided
        if (memberSchemes.length > 0) {
          const memberSchemesValues = memberSchemes.map((scheme) => [
            scheme.id || null,
            scheme.invoice_id || orderNumber,
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
        orderDetails.forEach((item) => {
          if (item.transaction_status === "Orders" && item.opentag_id) {
            const updateTagsSql = `
              UPDATE opening_tags_entry
              SET Status = 'Reserved'
              WHERE opentag_id = ?`;

            db.query(updateTagsSql, [item.opentag_id], (tagsErr) => {
              if (tagsErr) return callback(tagsErr);
            });
          }
        });

        // If everything succeeded, return success
        callback(null, { order_number: orderNumber });
      }
    });
  });
};

exports.getAllUniqueInvoices = (callback) => {
  const sql = `
    SELECT * 
    FROM repair_details r1
    WHERE r1.id = (
      SELECT MAX(r2.id) 
      FROM repair_details r2
      WHERE r1.order_number = r2.order_number
    )
  `;
  db.query(sql, callback);
};

exports.getByInvoiceNumber = (orderNumber, callback) => {
  const sql = `
    SELECT * 
    FROM repair_details
    WHERE order_number = ?
  `;
  db.query(sql, [orderNumber], callback);
};


exports.getAllRepairDetailsByInvoiceNumber = (order_number, callback) => {
  const sql = `
    SELECT * FROM repair_details
    WHERE order_number = ?
  `;

  // Query the database
  db.query(sql, [order_number], (err, results) => {
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

exports.updateStatus = (order_number, order_status) => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE repair_details SET order_status = ? WHERE order_number = ?`;
    const values = [order_status, order_number];

    console.log("Executing Query:", query, values); // Debugging

    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Error updating order status:", err);
        return reject(new Error("Database error"));
      }

      // Check if any rows were affected
      resolve(result.affectedRows > 0);
    });
  });
};

// Delete from repair_details table
exports.deleteRepairDetails = (orderNumber, callback) => {
  const query = `DELETE FROM repair_details WHERE order_number = ? AND transaction_status = 'Orders'`;
  db.query(query, [orderNumber], callback);
};

exports.updateOpeningTagsStatus = (opentagIds, callback) => {
  const sql = `
    UPDATE opening_tags_entry
    SET Status = 'Available'
    WHERE opentag_id IN (?)
  `;
  db.query(sql, [opentagIds], callback);
};

exports.getOpentagIdsByInvoiceNumber = (orderNumber, callback) => {
  const sql = `
    SELECT opentag_id
    FROM repair_details
    WHERE order_number = ?
  `;
  db.query(sql, [orderNumber], callback);
};

// Delete from old_items table
exports.deleteOldItems = (orderNumber, callback) => {
  const query = `DELETE FROM old_items WHERE invoice_id = ?`;
  db.query(query, [orderNumber], callback);
};

// Delete order details sequentially
exports.deleteOrderDetailsByInvoice = (orderNumber, callback) => {
  exports.getOpentagIdsByInvoiceNumber(orderNumber, (err, results) => {
    if (err) return callback(err);

    const opentagIds = results.map(row => row.opentag_id);
    if (opentagIds.length > 0) {
      exports.updateOpeningTagsStatus(opentagIds, (err) => {
        if (err) return callback(err);

        proceedToDelete(orderNumber, callback);
      });
    } else {
      // Proceed even if there are no opentagIds
      proceedToDelete(orderNumber, callback);
    }
  });
};

// Helper function to delete repair_details and old_items
function proceedToDelete(orderNumber, callback) {
  exports.deleteRepairDetails(orderNumber, (err) => {
    if (err) return callback(err);

    exports.deleteOldItems(orderNumber, (err) => {
      if (err) return callback(err);

      callback(null, { message: 'Order details deleted successfully' });
    });
  });
}







