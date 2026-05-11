const estimateModel = require("../models/estimateModel");

const addEstimate = (req, res) => {
  const data = req.body;

  // Simple validation
  if (!data.date || !data.estimate_number) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  estimateModel.insertOrUpdateEstimate(data, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err.message);
      return res.status(500).json({ message: 'Failed to insert data', error: err.message });
    }
    res.status(200).json({ message: 'Data inserted successfully', id: result.insertId });
  });
};

const getEstimates = (req, res) => {
    estimateModel.getEstimates((err, result) => {
      if (err) {
        console.error("Error fetching estimates:", err.message);
        return res.status(500).json({ message: "Failed to fetch estimates", error: err.message });
      }
      res.status(200).json(result);  // Send the list of estimates as JSON
    });
  };

  const updateEstimate = (req, res) => {
    const id = req.params.id;
    const data = req.body;
  
    estimateModel.updateEstimate(id, data, (err, result) => {
      if (err) {
        console.error("Error updating data:", err.message);
        return res.status(500).json({ message: "Failed to update estimate", error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Estimate not found" });
      }
      res.status(200).json({ message: "Estimate updated successfully" });
    });
  };

  const deleteEstimate = (req, res) => {
    const estimateNumber = req.params.estimate_number;
  
    estimateModel.deleteEstimateByNumber(estimateNumber, (err, result) => {
      if (err) {
        console.error("Error deleting data:", err.message);
        return res.status(500).json({ message: "Failed to delete estimate", error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Estimate not found" });
      }
      res.status(200).json({ message: "Estimate deleted successfully" });
    });
  };
  

  const getLastEstimateNumber = (req, res) => {
    estimateModel.getLastEstimateNumber((err, result) => {
      if (err) {
        console.error("Error fetching last estimate number:", err);
        return res.status(500).json({ error: "Failed to fetch last estimate number" });
      }
  
      if (result.length > 0) {
        // Process estimate numbers to find the next one
        const estNumbers = result
          .map(row => row.estimate_number)
          .filter(estimate => estimate.startsWith("EST"))
          .map(estimate => parseInt(estimate.slice(3), 10)); // Extract numeric part
  
        const lastEstimateNumber = Math.max(...estNumbers);
        const nextEstimateNumber = `EST${String(lastEstimateNumber + 1).padStart(3, "0")}`;
  
        res.json({ lastEstimateNumber: nextEstimateNumber });
      } else {
        res.json({ lastEstimateNumber: "EST001" }); // Start with EST001
      }
    });
  };

  const getAllUniqueEstimates = (req, res) => {
    estimateModel.getAllUniqueEstimates((err, results) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res.status(500).json({ message: "Error fetching data" });
      }
      res.json(results);
    });
  };

  const getEstimateDetailsByEstimateNumber = (req, res) => {
    const { estimate_number } = req.params;
  
    if (!estimate_number) {
      return res.status(400).json({ message: "Estimate number is required" });
    }
  
    estimateModel.getByEstimateNumber(estimate_number, (err, results) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res.status(500).json({ message: "Error fetching data" });
      }
  
      if (!results.length) {
        return res.status(404).json({ message: "No data found for the given estimate number" });
      }
  
      // Extract unique and repeated data
      const uniqueData = {
        date: results[0].date,
        estimate_number: results[0].estimate_number,
        total_amount: results[0].total_amount,
        taxable_amount: results[0].taxable_amount,
        tax_amount: results[0].tax_amount,
        net_amount: results[0].net_amount,
      };
  
      const repeatedData = results.map((row) => ({
        code: row.code,
        product_id: row.product_id,
        product_name: row.product_name,
        metal_type: row.metal_type,
        design_name: row.design_name,
        purity: row.purity,
        category:row.category,
        sub_category:row.sub_category,
        gross_weight: row.gross_weight,
        stone_weight: row.stone_weight,
        stone_price: row.stone_price,
        weight_bw: row.weight_bw,
        va_on: row.va_on,
        va_percent: row.va_percent,
        wastage_weight: row.wastage_weight,
        total_weight_av: row.total_weight_av,
        mc_on: row.mc_on,
        mc_per_gram: row.mc_per_gram,
        making_charges: row.making_charges,
        rate: row.rate,
        rate_amt: row.rate_amt,
        tax_percent: row.tax_percent,
        tax_amt: row.tax_amt,
        total_price: row.total_price,
        pricing: row.pricing,
        pieace_cost: row.pieace_cost,
        disscount_percentage: row.disscount_percentage,
        disscount: row.disscount,
        hm_charges: row.hm_charges,
        original_total_price:row.original_total_price,
        opentag_id:row.opentag_id,
        qty:row.qty,
      }));
  
      res.json({ uniqueData, repeatedData });
    });
  };
  
  module.exports = {
    addEstimate,
    getEstimates,
    updateEstimate,
    deleteEstimate,
    getLastEstimateNumber,
    getAllUniqueEstimates,
    getEstimateDetailsByEstimateNumber
  };
