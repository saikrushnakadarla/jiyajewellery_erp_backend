const express = require("express");
const router = express.Router();
const db = require("../db"); // Adjust the path based on your file structure

// Get advance receipts by mobile number
router.get("/advance-receipts/:mobile", (req, res) => {
  const { mobile } = req.params;

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  const query = `
    SELECT * 
    FROM payments 
    WHERE mobile = ? 
      AND transaction_type = 'Advance Receipt'
    ORDER BY date DESC, id DESC
  `;

  db.query(query, [mobile], (err, results) => {
    if (err) {
      console.error("Error fetching advance receipts:", err);
      return res.status(500).json({ error: "Database error occurred" });
    }

    // Format the results to ensure proper number formatting for amount fields
    const formattedResults = results.map((receipt) => ({
      ...receipt,
      discount_amt: parseFloat(receipt.discount_amt) || 0,
      total_amt: parseFloat(receipt.total_amt) || 0,
      cash_amt: parseFloat(receipt.cash_amt) || 0,
      total_wt: parseFloat(receipt.total_wt) || 0,
      paid_wt: parseFloat(receipt.paid_wt) || 0,
      bal_wt: parseFloat(receipt.bal_wt) || 0,
    }));

    res.json(formattedResults);
  });
});

// Update advance receipts with invoice number
// router.post("/update-advance-receipts", (req, res) => {
//   const { receiptIds, invoiceNumber, mobile, account_name } = req.body;

//   if (!receiptIds || !receiptIds.length || !invoiceNumber) {
//     return res
//       .status(400)
//       .json({ error: "Receipt IDs and invoice number are required" });
//   }

//   // Create placeholders for the IN clause
//   const placeholders = receiptIds.map(() => "?").join(",");

//   const query = `
//     UPDATE payments
//     SET
//       invoice_number = ?,
//       transaction_type = 'Receipt'
//     WHERE id IN (${placeholders})
//       AND transaction_type = 'Advance Receipt'
//       AND mobile = ?
//       AND account_name = ?
//   `;

//   const params = [invoiceNumber, ...receiptIds, mobile, account_name];

//   db.query(query, params, (err, result) => {
//     if (err) {
//       console.error("Error updating advance receipts:", err);
//       return res.status(500).json({ error: "Database error occurred" });
//     }

//     res.json({
//       success: true,
//       message: `${result.affectedRows} advance receipt(s) updated successfully`,
//       affectedRows: result.affectedRows,
//     });
//   });
// });

router.post("/update-advance-receipts", (req, res) => {
  const { receiptIds, invoiceNumber, mobile, account_name, invoiceAmount } = req.body;

  if (!receiptIds || !receiptIds.length) {
    return res.status(400).json({ error: "Receipt IDs required" });
  }

  const fetchQuery = `
    SELECT * FROM payments 
    WHERE id IN (?) 
    AND transaction_type='Advance Receipt'
    ORDER BY id
  `;

  db.query(fetchQuery, [receiptIds], (err, receipts) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error fetching receipts" });
    }

    let remainingInvoiceAmount = Number(invoiceAmount);

    const processNext = (index) => {
      if (index >= receipts.length || remainingInvoiceAmount <= 0) {
        return res.json({
          success: true,
          message: "Advance receipts adjusted successfully",
        });
      }

      const receipt = receipts[index];
      const receiptAmount = Number(receipt.discount_amt);

      if (remainingInvoiceAmount >= receiptAmount) {
        // FULLY USE RECEIPT
        remainingInvoiceAmount -= receiptAmount;

        const updateQuery = `
          UPDATE payments
          SET 
            transaction_type='Receipt',
            invoice_number=?
          WHERE id=?
        `;

        db.query(updateQuery, [invoiceNumber, receipt.id], (err) => {
          if (err) return res.status(500).json({ error: err });

          processNext(index + 1);
        });

      } else {
        // PARTIAL USE
        const usedAmount = remainingInvoiceAmount;
        const remainingBalance = receiptAmount - usedAmount;

        const updateQuery = `
          UPDATE payments
          SET 
            transaction_type='Receipt',
            invoice_number=?,
            total_amt=?,
            discount_amt=?
          WHERE id=?
        `;

        db.query(
          updateQuery,
          [invoiceNumber, usedAmount, usedAmount, receipt.id],
          (err) => {
            if (err) return res.status(500).json({ error: err });

            // Insert remaining advance receipt
            const insertQuery = `
              INSERT INTO payments (
                transaction_type,
                date,
                mode,
                receipt_no,
                account_name,
                invoice_number,
                total_amt,
                discount_amt,
                mobile,
                remarks,
                invoice_splitted,
                split_date
              )
              VALUES (
                'Advance Receipt',
                CURDATE(),
                ?,
                ?,
                ?,
                'ADVANCE',
                ?,
                ?,
                ?,
                'Advance Split',
                ?,
                CURDATE()
              )
            `;

            db.query(
              insertQuery,
              [
                receipt.mode,
                receipt.receipt_no,
                receipt.account_name,
                remainingBalance,
                remainingBalance,
                receipt.mobile,
                invoiceNumber,
              ],
              (err) => {
                if (err) return res.status(500).json({ error: err });

                remainingInvoiceAmount = 0;

                processNext(index + 1);
              }
            );
          }
        );
      }
    };

    processNext(0);
  });
});

// Get advance receipt by ID (for editing)
router.get("/advance-receipt/:id", (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      id,
      DATE_FORMAT(date, '%Y-%m-%d') as date,
      receipt_no,
      account_name,
      mobile,
      mode,
      cheque_number,
      discount_amt as advance_amount,
      remarks,
      transaction_type
    FROM payments 
    WHERE id = ? AND transaction_type = 'Advance Receipt'
  `;

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error fetching advance receipt:", err);
      return res.status(500).json({ error: "Database error occurred" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Advance receipt not found" });
    }

    res.json(results[0]);
  });
});

// Update advance receipt
router.put("/advance-receipt/:id", (req, res) => {
  const { id } = req.params;
  const { date, mode, cheque_number, advance_amount, remarks } = req.body;

  const query = `
    UPDATE payments 
    SET 
      date = ?,
      mode = ?,
      cheque_number = ?,
      discount_amt = ?,
      remarks = ?,
      updated_at = NOW()
    WHERE id = ? AND transaction_type = 'Advance Receipt'
  `;

  db.query(
    query,
    [date, mode, cheque_number, advance_amount, remarks, id],
    (err, result) => {
      if (err) {
        console.error("Error updating advance receipt:", err);
        return res.status(500).json({ error: "Database error occurred" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Advance receipt not found" });
      }

      res.json({
        success: true,
        message: "Advance receipt updated successfully",
        id: id,
      });
    },
  );
});

// Delete advance receipt
router.delete("/advance-receipt/:id", (req, res) => {
  const { id } = req.params;

  const query =
    'DELETE FROM payments WHERE id = ? AND transaction_type = "Advance Receipt"';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error deleting advance receipt:", err);
      return res.status(500).json({ error: "Database error occurred" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Advance receipt not found" });
    }

    res.json({
      success: true,
      message: "Advance receipt deleted successfully",
    });
  });
});

// Get all advance receipts for a date range (optional)
router.get("/advance-receipts", (req, res) => {
  const { startDate, endDate, mobile } = req.query;

  let query = `
    SELECT 
      id,
      DATE_FORMAT(date, '%Y-%m-%d') as date,
      receipt_no,
      account_name,
      mobile,
      mode,
      cheque_number,
      discount_amt as advance_amount,
      remarks,
      created_at
    FROM payments 
    WHERE transaction_type = 'Advance Receipt'
  `;

  const queryParams = [];

  if (startDate && endDate) {
    query += ` AND date BETWEEN ? AND ?`;
    queryParams.push(startDate, endDate);
  }

  if (mobile) {
    query += ` AND mobile = ?`;
    queryParams.push(mobile);
  }

  query += ` ORDER BY date DESC, id DESC`;

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching advance receipts:", err);
      return res.status(500).json({ error: "Database error occurred" });
    }

    const formattedResults = results.map((receipt) => ({
      ...receipt,
      advance_amount: parseFloat(receipt.advance_amount) || 0,
    }));

    res.json(formattedResults);
  });
});

// Get total advance amount for a mobile number
router.get("/advance-receipts/total/:mobile", (req, res) => {
  const { mobile } = req.params;

  const query = `
    SELECT 
      COALESCE(SUM(discount_amt), 0) as total_advance
    FROM payments 
    WHERE mobile = ? AND transaction_type = 'Advance Receipt'
  `;

  db.query(query, [mobile], (err, results) => {
    if (err) {
      console.error("Error calculating total advance:", err);
      return res.status(500).json({ error: "Database error occurred" });
    }

    res.json({
      mobile: mobile,
      total_advance: parseFloat(results[0].total_advance) || 0,
    });
  });
});

module.exports = router;
