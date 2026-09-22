const SalesRateCutsModel = require("../models/salesRateCutsModel");

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

module.exports = {
  getAllSalesRateCuts,
  getSalesRateCutById,
  addSalesRateCut,
  getSalesBalance,
};