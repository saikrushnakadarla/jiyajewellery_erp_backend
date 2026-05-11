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
    if (!result) {
      return res.status(404).json({ message: "Rate cut not found" });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching rateCut by ID:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const addRateCut = async (req, res) => {
  const formData = req.body;
  try {
    // Insert into rateCuts table
    const insertId = await RateCutsModel.insertRateCut(formData);

    // Update purchases table
    await RateCutsModel.updatePurchase(formData.purchase_id, formData.rate_cut_wt);

    res.status(200).json({ message: "Rate cut details stored successfully and purchase updated.", insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error." });
  }
};

module.exports = { getAllRateCuts, getRateCutById, addRateCut };
