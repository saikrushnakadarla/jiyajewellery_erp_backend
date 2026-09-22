const RateCutsModel = require("../models/rateCutsModel");

const getAllRateCuts = async (req, res) => {
  try {
    const results = await RateCutsModel.getAllRateCuts();
    res.status(200).json(results);
  } catch (err) {
    console.error("Error fetching rateCuts:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const getRateCutById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await RateCutsModel.getRateCutById(id);
    if (!result) return res.status(404).json({ message: "Rate cut not found" });
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching rateCut by ID:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const addRateCut = async (req, res) => {
  const formData = req.body;
  try {
    const insertId = await RateCutsModel.insertRateCut(formData);
    res.status(200).json({ message: "Rate cut stored successfully.", insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error." });
  }
};

const getPurchaseBalance = async (req, res) => {
  const { purchase_id } = req.params;
  const total_pure_wt = parseFloat(req.query.total_pure_wt) || 0;

  try {
    const usedWt = await RateCutsModel.getTotalRateCutWeight(purchase_id);
    const balance = Math.max(0, total_pure_wt - usedWt);
    res.status(200).json({
      purchase_id: parseInt(purchase_id, 10),
      total_pure_wt,
      total_rate_cut_wt: usedWt,
      balance_weight: parseFloat(balance.toFixed(3)),
    });
  } catch (error) {
    console.error("Error computing purchase balance:", error);
    res.status(500).json({ error: "Database error." });
  }
};

module.exports = { getAllRateCuts, getRateCutById, addRateCut, getPurchaseBalance };