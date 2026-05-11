const db = require("./../../db");

exports.insert = (
  repairDetails,
  oldItems = [],
  memberSchemes = [],
  salesNetAmount,
  totalAmount,
  discountAmt,
  festivalDiscountAmt,
  taxableAmount,
  taxAmount,
  netAmount,
  oldItemsAmount,
  schemeAmount,
  salesTaxableAmount,
  selectedAdvanceReceiptAmount,
  callback,
) => {
  if (!Array.isArray(repairDetails) || repairDetails.length === 0) {
    return callback(new Error("Invalid repairDetails array"));
  }

  let currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  let originalInvoiceNumber = repairDetails[0].invoice_number;

  const padNumber = (num, size) => {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  };

  const getNextInvoiceNumber = (prefix, currentMaxNumber) => {
    const nextNumber = parseInt(currentMaxNumber) + 1;
    return `${prefix}${padNumber(nextNumber, 3)}`;
  };

  const invoiceRegex = /^([A-Za-z]+)(\d+)$/;
  const match = originalInvoiceNumber.match(invoiceRegex);

  if (!match) {
    return callback(new Error("Invalid invoice number format"));
  }

  const prefix = match[1];
  const currentNumber = parseInt(match[2]);

  const invoiceCheckSql = `SELECT invoice_number FROM repair_details WHERE invoice_number LIKE '${prefix}%'`;

  // First, process customer details for all repair items
  const processCustomerDetails = (callback) => {
    const customerPromises = repairDetails.map((item) => {
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
              "CUSTOMERS",
            ];

            db.query(
              insertCustomerSql,
              customerParams,
              (insertErr, insertResult) => {
                if (insertErr) return reject(insertErr);
                item.customer_id = insertResult.insertId;
                resolve(item.customer_id);
              },
            );
          }
        });
      });
    });

    Promise.all(customerPromises)
      .then(() => callback(null))
      .catch((err) => callback(err));
  };

  // Process customer details first
  processCustomerDetails((err) => {
    if (err) return callback(err);

    // Continue with the rest of the invoice processing
    db.query(invoiceCheckSql, (err, rows) => {
      if (err) return callback(err);

      let maxNumber = currentNumber;

      rows.forEach((row) => {
        const rowMatch = row.invoice_number.match(invoiceRegex);
        if (rowMatch && rowMatch[1] === prefix) {
          const num = parseInt(rowMatch[2]);
          if (num >= maxNumber) {
            maxNumber = num;
          }
        }
      });

      let newInvoiceNumber;
      const exists = rows.some(
        (r) => r.invoice_number === originalInvoiceNumber,
      );

      if (exists) {
        newInvoiceNumber = getNextInvoiceNumber(prefix, maxNumber);
      } else {
        newInvoiceNumber = originalInvoiceNumber;
      }

      // Use amounts directly from frontend instead of recalculating
      // Validate and parse the amounts
      const parsedTotalAmount = parseFloat(totalAmount) || 0;
      const parsedDiscountAmt = parseFloat(discountAmt) || 0;
      const parsedFestivalDiscountAmt = parseFloat(festivalDiscountAmt) || 0;
      const parsedTaxableAmount = parseFloat(taxableAmount) || 0;
      const parsedTaxAmount = parseFloat(taxAmount) || 0;
      const parsedNetAmount = parseFloat(netAmount) || 0;
      const parsedOldItemsAmount = parseFloat(oldItemsAmount) || 0;
      const parsedSchemeAmount = parseFloat(schemeAmount) || 0;
      const parsedSalesNetAmount = parseFloat(salesNetAmount) || 0;
      const parsedSalesTaxableAmount = parseFloat(salesTaxableAmount) || 0;
      const parsedSelectedAdvanceReceiptAmount =
        parseFloat(selectedAdvanceReceiptAmount) || 0;

      const totalOldAmount = oldItems.reduce((sum, item) => {
        return sum + (parseFloat(item.total_amount) || 0);
      }, 0);

      const schemesTotalAmount = memberSchemes.reduce((sum, scheme) => {
        return sum + (parseFloat(scheme.paid_amount) || 0);
      }, 0);

      const sanitizeNumeric = (value) => {
        if (value === null || value === undefined || value === "NaN") return 0;
        const num = parseFloat(value.toString().replace(/[^\d.]/g, ""));
        return isNaN(num) ? 0 : num;
      };

      // Check if we should update existing records or insert new ones
      const checkExistingSql = `SELECT id, order_number FROM repair_details WHERE id IN (?)`;
      const existingIds = repairDetails
        .map((item) => item.id)
        .filter((id) => id);

      // Get all order numbers from repairDetails
      const orderNumbers = repairDetails
        .map((item) => item.order_number)
        .filter(Boolean);

      // Function to update repairs table for converted orders
      const updateRepairsTable = (invoiceNumber, callback) => {
        if (orderNumbers.length === 0) {
          return callback(null);
        }

        const updateRepairsSql = `
          UPDATE repairs 
          SET invoice = 'Converted', 
              status = 'Delivered to Customer',
              invoice_number = ?
          WHERE repair_no IN (?)`;

        db.query(updateRepairsSql, [invoiceNumber, orderNumbers], (err) => {
          if (err) return callback(err);
          callback(null);
        });
      };

      if (existingIds.length > 0) {
        db.query(checkExistingSql, [existingIds], (err, existingRows) => {
          if (err) return callback(err);

          const existingIdsSet = new Set(existingRows.map((row) => row.id));
          const itemsToInsert = [];
          const itemsToUpdate = [];

          repairDetails.forEach((item) => {
            if (item.id && item.order_number && existingIdsSet.has(item.id)) {
              // Case 1: ID exists in DB → update and also insert as a new row with a new id

              // Update invoice_number for the item to be updated
              item.invoice_number = newInvoiceNumber;
              itemsToUpdate.push(item);

              // Clone item, remove ID, and set transaction_status for new insert
              const newItem = { ...item };
              delete newItem.id; // Let DB auto-generate ID
              newItem.transaction_status = "ConvertedInvoice"; // Set status for the new insert
              itemsToInsert.push(newItem);
            } else if (item.id && existingIdsSet.has(item.id)) {
              // Case 2: Just update
              itemsToUpdate.push(item);
            } else {
              // Case 3: Insert (either new item or one with ID not found in DB)
              itemsToInsert.push(item);
            }
          });

          // Process updates first - use original invoice number for updates
          const updatePromises = itemsToUpdate.map((item) => {
            return new Promise((resolve, reject) => {
              const cashAmount = parseFloat(item.cash_amount) || 0;
              const cardAmount = parseFloat(item.card_amt) || 0;
              const chqAmount = parseFloat(item.chq_amt) || 0;
              const onlineAmount = parseFloat(item.online_amt) || 0;

              const paidAmt =
                cashAmount + cardAmount + chqAmount + onlineAmount;
              const netBillAmount = Math.max(
                0,
                parsedNetAmount -
                  (schemesTotalAmount +
                    parsedSalesNetAmount +
                    parsedSelectedAdvanceReceiptAmount),
              );
              // const netBillAmount = parsedNetAmount - (schemesTotalAmount + parsedSalesNetAmount+ parsedSelectedAdvanceReceiptAmount );
              // const netBillAmount = parsedNetAmount;
              const roundedNetBillAmount = Math.round(netBillAmount);
              const balAmt = Math.max(0, roundedNetBillAmount - paidAmt);
          // const balAmt = roundedNetBillAmount - paidAmt;

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
                  order_number = ?,
                  invoice = ?,
                  hm_charges = ?,
                  remarks = ?,
                  sale_status = ?,
                  invoice_number = ?,
                  taxable_amount = ?,
                  tax_amount = ?,
                  net_amount = ?,
                  old_exchange_amt = ?,
                  scheme_amt = ?,
                  sale_return_amt = ?,
                  advance_receipt_amt = ?,
                  receipts_amt = ?,
                  bal_after_receipts = ?,
                  bal_amt = ?,
                  net_bill_amount = ?,
                  paid_amt = ?,
                  piece_taxable_amt = ?,
                  original_piece_taxable_amt = ?
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
                item.transaction_status || "Sales",
                item.qty || null,
                item.product_image || null,
                item.imagePreview || null,
                item.order_number || null,
                item.invoice || null,
                item.hm_charges || null,
                item.remarks || null,
                item.sale_status || null,
                item.invoice_number || null,
                parsedTaxableAmount,
                parsedTaxAmount,
                parsedNetAmount,
                totalOldAmount,
                schemesTotalAmount,
                parsedSalesNetAmount,
                parsedSelectedAdvanceReceiptAmount,
                item.finalReceiptsAmt,
                item.finalBalAfterReceipts,
                balAmt,
                roundedNetBillAmount,
                paidAmt,
                sanitizeNumeric(item.piece_taxable_amt),
                sanitizeNumeric(item.original_piece_taxable_amt),
                item.id,
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
            const netBillAmount = Math.max(
              0,
              parsedNetAmount -
                (schemesTotalAmount +
                  parsedSalesNetAmount +
                  parsedSelectedAdvanceReceiptAmount),
            );
            // const netBillAmount = parsedNetAmount - (schemesTotalAmount + parsedSalesNetAmount+ parsedSelectedAdvanceReceiptAmount );
            // const netBillAmount = parsedNetAmount;
            const roundedNetBillAmount = Math.round(netBillAmount);
            const balAmt = Math.max(0, roundedNetBillAmount - paidAmt);
          // const balAmt = roundedNetBillAmount - paidAmt;

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
              newInvoiceNumber, // Using new invoice number for inserts
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
              item.transaction_status || "Sales",
              item.qty || null,
              item.product_image || null,
              item.imagePreview || null,
              item.order_number || null,
              item.invoice || null,
              item.hm_charges || null,
              item.remarks || null,
              item.sale_status || null,
              parsedTaxableAmount,
              parsedTaxAmount,
              parsedNetAmount,
              totalOldAmount,
              schemesTotalAmount,
              parsedSalesNetAmount,
              parsedSelectedAdvanceReceiptAmount,
              item.finalReceiptsAmt,
              item.finalBalAfterReceipts,
              balAmt,
              roundedNetBillAmount,
              paidAmt,
              sanitizeNumeric(item.piece_taxable_amt),
              sanitizeNumeric(item.original_piece_taxable_amt),
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
              scheme_amt, sale_return_amt, advance_receipt_amt, receipts_amt, bal_after_receipts, bal_amt, net_bill_amount, paid_amt, 
              piece_taxable_amt, original_piece_taxable_amt
            ) VALUES ?`;

          // Execute all operations
          Promise.all(updatePromises)
            .then(() => {
              if (insertValues.length > 0) {
                db.query(
                  insertSql,
                  [insertValues],
                  (insertErr, insertResult) => {
                    if (insertErr) return callback(insertErr);
                    // Update repairs table for converted orders
                    updateRepairsTable(newInvoiceNumber, (err) => {
                      if (err) return callback(err);
                      processRelatedTables(newInvoiceNumber, callback);
                    });
                  },
                );
              } else {
                // For updates only, use the original invoice number in related tables
                // Update repairs table for converted orders
                updateRepairsTable(newInvoiceNumber, (err) => {
                  if (err) return callback(err);
                  processRelatedTables(originalInvoiceNumber, callback);
                });
              }
            })
            .catch((err) => callback(err));
        });
      } else {
        // No existing IDs, proceed with insert only - use new invoice number
        const insertValues = repairDetails.map((item) => {
          const cashAmount = parseFloat(item.cash_amount) || 0;
          const cardAmount = parseFloat(item.card_amt) || 0;
          const chqAmount = parseFloat(item.chq_amt) || 0;
          const onlineAmount = parseFloat(item.online_amt) || 0;

          const paidAmt = cashAmount + cardAmount + chqAmount + onlineAmount;
          const netBillAmount = Math.max(
            0,
            parsedNetAmount -
              (schemesTotalAmount +
                parsedSalesNetAmount +
                parsedSelectedAdvanceReceiptAmount),
          );
          // const netBillAmount = parsedNetAmount - (schemesTotalAmount + parsedSalesNetAmount+ parsedSelectedAdvanceReceiptAmount );
          // const netBillAmount = parsedNetAmount;
          const roundedNetBillAmount = Math.round(netBillAmount);
          const balAmt = Math.max(0, roundedNetBillAmount - paidAmt);
          // const balAmt = roundedNetBillAmount - paidAmt;

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
            newInvoiceNumber, // Using new invoice number for inserts
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
            item.transaction_status || "Sales",
            item.qty || null,
            item.product_image || null,
            item.imagePreview || null,
            item.order_number || null,
            item.invoice || null,
            item.hm_charges || null,
            item.remarks || null,
            item.sale_status || null,
            parsedTaxableAmount,
            parsedTaxAmount,
            parsedNetAmount,
            totalOldAmount,
            schemesTotalAmount,
            parsedSalesNetAmount,
            parsedSelectedAdvanceReceiptAmount,
            item.finalReceiptsAmt,
            item.finalBalAfterReceipts,
            balAmt,
            roundedNetBillAmount,
            paidAmt,
            sanitizeNumeric(item.piece_taxable_amt),
            sanitizeNumeric(item.original_piece_taxable_amt),
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
            scheme_amt, sale_return_amt, advance_receipt_amt, receipts_amt, bal_after_receipts, bal_amt, net_bill_amount, paid_amt, 
            piece_taxable_amt,original_piece_taxable_amt
          ) VALUES ?`;

        db.query(insertSql, [insertValues], (insertErr, insertResult) => {
          if (insertErr) return callback(insertErr);
          // Update repairs table for converted orders
          updateRepairsTable(newInvoiceNumber, (err) => {
            if (err) return callback(err);
            processRelatedTables(newInvoiceNumber, callback);
          });
        });
      }

      function processRelatedTables(invoiceNumber, callback) {
        // Insert old_items if provided
        if (oldItems.length > 0) {
          const oldItemsValues = oldItems.map((item) => [
            item.id || null,
            invoiceNumber,
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
            scheme.invoice_id || invoiceNumber,
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
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
              invoice_id = VALUES(invoice_id),
              scheme = VALUES(scheme),
              member_name = VALUES(member_name),
              member_number = VALUES(member_number),
              scheme_name = VALUES(scheme_name),
              installments_paid = VALUES(installments_paid),
              duration_months = VALUES(duration_months),
              paid_months = VALUES(paid_months),
              pending_months = VALUES(pending_months),
              pending_amount = VALUES(pending_amount),
              paid_amount = VALUES(paid_amount),
              schemes_total_amount = VALUES(schemes_total_amount);
          `;

          db.query(
            memberSchemesSql,
            [memberSchemesValues],
            (memberSchemesErr) => {
              if (memberSchemesErr) return callback(memberSchemesErr);
            },
          );
        }

        // Update stock status in the opening_tags_entry table
        repairDetails.forEach((item) => {
          if (item.transaction_status === "Sales" && item.opentag_id) {
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
        if (existingIds.length === 0) {
          // Aggregate updates for the product table by product_id
          const aggregatedUpdates = repairDetails.reduce((acc, item) => {
            if (item.transaction_status === "Sales" && item.product_id) {
              if (!acc[item.product_id]) {
                acc[item.product_id] = {
                  qty: 0,
                  grossWeight: 0,
                  pricing: item.pricing,
                };
              }

              acc[item.product_id].qty += parseFloat(item.qty) || 0;

              if (item.pricing === "By Weight") {
                acc[item.product_id].grossWeight +=
                  parseFloat(item.gross_weight) || 0;
              }
            }
            return acc;
          }, {});

          const updateQueries = Object.entries(aggregatedUpdates).map(
            ([productId, { qty, grossWeight, pricing }]) => {
              return new Promise((resolve, reject) => {
                let updateSaleSql;
                let saleParams;

                if (pricing === "By Weight") {
                  updateSaleSql = `
                  UPDATE product
                  SET 
                    sale_qty = IFNULL(sale_qty, 0) + ?, 
                    sale_weight = IFNULL(sale_weight, 0) + ?
                  WHERE product_id = ?`;
                  saleParams = [qty, grossWeight, productId];
                } else {
                  updateSaleSql = `
                  UPDATE product
                  SET 
                    sale_qty = IFNULL(sale_qty, 0) + ?
                  WHERE product_id = ?`;
                  saleParams = [qty, productId];
                }

                db.query(updateSaleSql, saleParams, (saleErr) => {
                  if (saleErr) return reject(saleErr);

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
            },
          );

          Promise.all(updateQueries)
            .then(() => callback(null, { invoice_number: invoiceNumber }))
            .catch((updateErr) => callback(updateErr));
        } else {
          // If it's an update operation, just callback without updating product table
          callback(null, { invoice_number: invoiceNumber });
        }
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
      WHERE r1.invoice_number = r2.invoice_number
    )
  `;
  db.query(sql, callback);
};

exports.getByInvoiceNumber = (invoiceNumber, callback) => {
  const sql = `
    SELECT * 
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
  const sql = "SELECT * FROM repair_details";
  db.query(sql, callback);
};

// exports.updateStatus = (invoice_number, order_status) => {
//   return new Promise((resolve, reject) => {
//     const query = `
//       UPDATE repair_details SET order_status = ? WHERE invoice_number = ?
//     `;
//     const values = [order_status, invoice_number];

//     db.query(query, values, (err, result) => {
//       if (err) {
//         console.error('Error updating order status:', err);
//         return reject(new Error('Database error'));
//       }

//       // Check if any rows were affected
//       resolve(result.affectedRows > 0);
//     });
//   });
// };

exports.deleteRepairDetailsByInvoice = (invoiceNumber, callback) => {
  const sql = `
    DELETE FROM repair_details
    WHERE invoice_number = ? AND (transaction_status = 'Sales' OR transaction_status = 'ConvertedInvoice' OR transaction_status = 'ConvertedRepairInvoice')
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.updateOpeningTagsStatus = (opentagIds, callback) => {
  const sql = `
    UPDATE opening_tags_entry
    SET Status = 'Available'
    WHERE opentag_id IN (?)
  `;
  db.query(sql, [opentagIds], callback);
};

exports.getOpentagIdsByInvoiceNumber = (invoiceNumber, callback) => {
  const sql = `
    SELECT opentag_id
    FROM repair_details
    WHERE invoice_number = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.getProductDetailsByInvoiceNumber = (invoiceNumber, callback) => {
  const sql = `
    SELECT product_id, qty, gross_weight
    FROM repair_details
    WHERE invoice_number = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.getRepairDetailsByInvoiceNumber = (invoiceNumber, callback) => {
  const sql = `
    SELECT transaction_status
    FROM repair_details
    WHERE invoice_number = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};

exports.updateProductQuantities = (productId, qty, grossWeight, callback) => {
  const sql = `
    UPDATE product
    SET 
      sale_qty = sale_qty - ?,
      sale_weight = sale_weight - ?,
      bal_qty = pur_qty - sale_qty,
      bal_weight = pur_weight - sale_weight
    WHERE product_id = ?
  `;
  db.query(sql, [qty, grossWeight, productId], callback);
};

exports.deleteOldItemsByInvoice = (invoiceNumber, callback) => {
  const sql = `
    DELETE FROM old_items
    WHERE invoice_id = ?
  `;
  db.query(sql, [invoiceNumber], callback);
};
