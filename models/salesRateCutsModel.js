const db = require("../db");

const getAllSalesRateCuts = async () => {
  const query = `SELECT * FROM salesRateCuts ORDER BY created_at DESC`;
  const [rows] = await db.promise().query(query);
  return rows;
};

const getSalesRateCutById = async (id) => {
  const query = `SELECT * FROM salesRateCuts WHERE rate_cut_id = ?`;
  const [rows] = await db.promise().query(query, [id]);
  return rows[0];
};

const insertSalesRateCut = async (formData) => {
  const paid_amount = formData.paid_amount ? parseFloat(formData.paid_amount) : 0;
  const rate_cut_wt = formData.rate_cut_wt ? parseFloat(formData.rate_cut_wt) : 0;
  const rate_cut = formData.rate_cut ? parseFloat(formData.rate_cut) : 0;
  const rate_cut_amt = formData.rate_cut_amt ? parseFloat(formData.rate_cut_amt) : 0;

  const balance_amount = formData.balance_amount
    ? parseFloat(formData.balance_amount)
    : rate_cut_amt - paid_amount;

  const paid_wt = paid_amount && rate_cut ? paid_amount / rate_cut : 0;
  const bal_wt = rate_cut_wt - paid_wt;

  const query = `
    INSERT INTO salesRateCuts
    (sales_id, invoice, category, total_pure_wt, rate_cut_wt, rate_cut, rate_cut_amt,
     paid_amount, balance_amount, paid_wt, bal_wt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const [result] = await db.promise().query(query, [
    formData.sales_id,
    formData.invoice,
    formData.category,
    parseFloat(formData.total_pure_wt) || 0,
    rate_cut_wt,
    rate_cut,
    rate_cut_amt,
    paid_amount,
    balance_amount,
    paid_wt,
    bal_wt,
  ]);

  return result.insertId;
};

const getTotalRateCutWeight = async (sales_id) => {
  const query = `
    SELECT COALESCE(SUM(rate_cut_wt), 0) AS total_used
    FROM salesRateCuts
    WHERE sales_id = ?
  `;
  const [rows] = await db.promise().query(query, [sales_id]);
  return parseFloat(rows[0].total_used) || 0;
};

module.exports = {
  getAllSalesRateCuts,
  getSalesRateCutById,
  insertSalesRateCut,
  getTotalRateCutWeight,
};