const SalesRateCutsModel = require("../models/salesRateCutsModel");

const getAllSalesRateCuts = async (req, res) => {
    try {
        const results = await SalesRateCutsModel.getAllSalesRateCuts();
        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching sales rate cuts:", err);
        res.status(500).json({ error: "Database error" });
    }
};

const getSalesRateCutById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await SalesRateCutsModel.getSalesRateCutById(id);
        if (!result) {
            return res.status(404).json({ message: "Rate cut not found" });
        }
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching rate cut by ID:", err);
        res.status(500).json({ error: "Database error" });
    }
};

const getSalesRateCutsByRepairId = async (req, res) => {
    const { repairId } = req.params;
    try {
        const results = await SalesRateCutsModel.getSalesRateCutsByRepairId(repairId);
        res.status(200).json(results);
    } catch (err) {
        console.error("Error fetching rate cuts by repair ID:", err);
        res.status(500).json({ error: "Database error" });
    }
};

const addSalesRateCut = async (req, res) => {
    const formData = req.body;
    
    try {
        // Validate required fields
        if (!formData.repair_id || !formData.invoice_number) {
            return res.status(400).json({ error: "Repair ID and Invoice Number are required" });
        }
        
        if (!formData.rate_cut_wt || parseFloat(formData.rate_cut_wt) <= 0) {
            return res.status(400).json({ error: "Rate Cut Weight is required and must be greater than 0" });
        }
        
        if (!formData.rate_cut || parseFloat(formData.rate_cut) <= 0) {
            return res.status(400).json({ error: "Rate Cut value is required and must be greater than 0" });
        }
        
        // Insert into sales_rate_cuts table
        const insertId = await SalesRateCutsModel.insertSalesRateCut(formData);
        
        // Update repair_details table with cumulative rate cut values
        await SalesRateCutsModel.updateRepairDetailsWithRateCut(
            formData.repair_id, 
            formData.paid_amount || 0, 
            formData.rate_cut_wt
        );
        
        res.status(200).json({ 
            message: "Sales rate cut added successfully and repair details updated.", 
            insertId 
        });
    } catch (error) {
        console.error("Error adding sales rate cut:", error);
        res.status(500).json({ error: "Database error: " + error.message });
    }
};

module.exports = { 
    getAllSalesRateCuts, 
    getSalesRateCutById, 
    getSalesRateCutsByRepairId,
    addSalesRateCut 
};