const db = require("../db");

const insertSalesPayment = async (paymentData) => {
  const query = `
    INSERT INTO salesPayments
    (date, mode, cheque_number, payment_no, account_name, invoice, category,
     rate_cut, total_wt, paid_wt, bal_wt, total_amt, paid_amt, bal_amt,
     paid_by, remarks, rate_cut_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    paymentData.date,
    paymentData.mode,
    paymentData.cheque_number,
    paymentData.payment_no,
    paymentData.account_name,
    paymentData.invoice,
    paymentData.category,
    parseFloat(paymentData.rate_cut) || 0,
    parseFloat(paymentData.total_wt) || 0,
    parseFloat(paymentData.paid_wt) || 0,
    parseFloat(paymentData.bal_wt) || 0,
    parseFloat(paymentData.total_amt) || 0,
    parseFloat(paymentData.paid_amt) || 0,
    parseFloat(paymentData.bal_amt) || 0,
    paymentData.paid_by,
    paymentData.remarks,
    paymentData.rate_cut_id || null,
  ];

  const [result] = await db.promise().query(query, values);
  return result.insertId;
};

const updateSalesRateCutsTable = async (rate_cut_id, paid_wt, paid_amt) => {
  if (!rate_cut_id) return;

  try {
    await db.promise().query(
      `UPDATE salesRateCuts SET paid_wt = COALESCE(paid_wt, 0) + ? WHERE rate_cut_id = ?`,
      [paid_wt || 0, rate_cut_id]
    );

    await db.promise().query(
      `UPDATE salesRateCuts SET bal_wt = rate_cut_wt - paid_wt WHERE rate_cut_id = ?`,
      [rate_cut_id]
    );

    await db.promise().query(
      `UPDATE salesRateCuts SET paid_amount = COALESCE(paid_amount, 0) + ? WHERE rate_cut_id = ?`,
      [paid_amt || 0, rate_cut_id]
    );

    await db.promise().query(
      `UPDATE salesRateCuts SET balance_amount = rate_cut_amt - paid_amount WHERE rate_cut_id = ?`,
      [rate_cut_id]
    );
  } catch (error) {
    console.error("Error updating salesRateCuts table:", error);
    throw error;
  }
};

const fetchSalesPayments = async () => {
  const query = `SELECT * FROM salesPayments ORDER BY created_at DESC`;
  const [results] = await db.promise().query(query);
  return results;
};

const getLastSalesPaymentNumber = async () => {
  const query = `SELECT payment_no FROM salesPayments ORDER BY id DESC LIMIT 1`;
  const [rows] = await db.promise().query(query);

  if (!rows.length || !rows[0].payment_no) {
    return "SPAY0001";
  }

  const lastPaymentNo = String(rows[0].payment_no);
  const match = lastPaymentNo.match(/(\d+)$/);

  if (!match) {
    return "SPAY0001";
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;
  return lastPaymentNo.replace(/(\d+)$/, String(nextNumber));
};

module.exports = {
  insertSalesPayment,
  updateSalesRateCutsTable,
  fetchSalesPayments,
  getLastSalesPaymentNumber,
};