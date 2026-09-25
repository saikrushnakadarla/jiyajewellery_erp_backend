const SalesRateCutsModel = require("../models/salesRateCutsModel");
const db = require("../db");

const getAllSalesRateCuts = async (req, res) => {
  try {
    const results = await SalesRateCutsModel.getAllSalesRateCuts();
    res.status(200).json(results);
  } catch (err) {
    console.error("Error fetching salesRateCuts:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const getSalesRateCutById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await SalesRateCutsModel.getSalesRateCutById(id);
    if (!result) {
      return res.status(404).json({ message: "Sales rate cut not found" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching salesRateCut by ID:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const addSalesRateCut = async (req, res) => {
  const formData = req.body;

  if (!formData.sales_id || !formData.invoice) {
    return res.status(400).json({ error: "sales_id and invoice are required" });
  }

  try {
    const insertId = await SalesRateCutsModel.insertSalesRateCut(formData);
    res.status(200).json({
      message: "Sales rate cut stored successfully.",
      insertId,
    });
  } catch (error) {
    console.error("Error adding sales rate cut:", error);
    res.status(500).json({ error: "Database error." });
  }
};

const getSalesBalance = async (req, res) => {
  const { sales_id } = req.params;
  const total_weight_av = parseFloat(req.query.total_weight_av) || 0;

  try {
    const usedWt = await SalesRateCutsModel.getTotalRateCutWeight(sales_id);
    const balance = Math.max(0, total_weight_av - usedWt);
    res.status(200).json({
      sales_id: parseInt(sales_id, 10),
      total_weight_av,
      total_rate_cut_wt: usedWt,
      balance_weight: parseFloat(balance.toFixed(3)),
    });
  } catch (error) {
    console.error("Error computing sales balance:", error);
    res.status(500).json({ error: "Database error." });
  }
};

const applyReceiptToRateCut = async (req, res) => {
  try {
    const { rate_cut_id, paid_amount } = req.body;

    if (!rate_cut_id || !paid_amount) {
      return res.status(400).json({ message: "rate_cut_id and paid_amount required" });
    }

    const conn = db.promise();

    // ✅ Fetch current ratecut state (including rate_cut_wt which NEVER changes)
    const [rows] = await conn.query(
      `SELECT rate_cut_amt, paid_amount, balance_amount, rate_cut, rate_cut_wt, paid_wt 
       FROM salesRateCuts WHERE rate_cut_id = ?`,
      [rate_cut_id]
    );

    if (!rows.length) return res.status(404).json({ message: "RateCut not found" });

    const rc = rows[0];
    const rate = parseFloat(rc.rate_cut) || 0;
    const currentPaidAmt = parseFloat(rc.paid_amount) || 0;
    const currentPaidWt = parseFloat(rc.paid_wt) || 0;
    const rateCutAmt = parseFloat(rc.rate_cut_amt) || 0;
    const rateCutWt = parseFloat(rc.rate_cut_wt) || 0;

    // ✅ Add new payment to existing paid
    const newPaidAmt = currentPaidAmt + parseFloat(paid_amount);
    const newPaidWt = currentPaidWt + (rate > 0 ? parseFloat(paid_amount) / rate : 0);

    // ✅ balance_amount = rate_cut_amt − total paid (never below 0)
    const newBalanceAmount = Math.max(0, rateCutAmt - newPaidAmt);

    // ✅ bal_wt = rate_cut_wt − total paid_wt (never below 0)
    const newBalWt = Math.max(0, rateCutWt - newPaidWt);

    await conn.query(
      `UPDATE salesRateCuts 
       SET paid_amount = ?, balance_amount = ?, paid_wt = ?, bal_wt = ?
       WHERE rate_cut_id = ?`,
      [newPaidAmt, newBalanceAmount, newPaidWt, newBalWt, rate_cut_id]
    );

    res.json({
      message: "Updated successfully",
      paid_amount: newPaidAmt,
      balance_amount: newBalanceAmount,
      paid_wt: newPaidWt,
      bal_wt: newBalWt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to apply receipt" });
  }
};

const getRateCutsByInvoice = async (req, res) => {
  try {
    const { invoice } = req.params;
    const [rows] = await db.promise().query(
      `SELECT rate_cut_id, sales_id, invoice, category, rate_cut_wt, rate_cut, 
              rate_cut_amt, paid_amount, balance_amount, paid_wt, bal_wt
       FROM salesRateCuts WHERE invoice = ? ORDER BY rate_cut_id ASC`,
      [invoice]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ratecuts" });
  }
};

module.exports = {
  getAllSalesRateCuts,
  getSalesRateCutById,
  addSalesRateCut,
  getSalesBalance,
  applyReceiptToRateCut,
  getRateCutsByInvoice,
};