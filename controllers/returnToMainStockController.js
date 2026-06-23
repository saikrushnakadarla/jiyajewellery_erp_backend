const returnToMainStockModel = require("../models/returnToMainStockModel");

// =============================================
// SAVE: Save return to main stock
// =============================================
exports.saveReturnToMainStock = (req, res) => {
    try {
        const { 
            return_data, 
            from_stock_point_id,
            to_stock_point_id,
            return_date,
            reference_number,
            remarks,
            created_by,
            from_user_id,
            to_user_id,
            assigned_ids = [] // IDs from assigned_salesman to delete
        } = req.body;

        if (!return_data || !Array.isArray(return_data) || return_data.length === 0) {
            return res.status(400).json({ message: "No return data provided" });
        }

        if (!from_stock_point_id) {
            return res.status(400).json({ message: "From stock point is required" });
        }

        // Insert return records
        returnToMainStockModel.insert(
            return_data,
            from_stock_point_id,
            to_stock_point_id || null, // Usually NULL for main stock
            return_date,
            reference_number,
            remarks,
            created_by,
            from_user_id,
            to_user_id,
            (err, result) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ message: "Error saving return to main stock data", error: err });
                }
                
                // After successful transfer, update opening_tags_entry
                if (return_data.length > 0) {
                    returnToMainStockModel.updateStockPointForReturn(
                        return_data,
                        (updateErr, updateResult) => {
                            if (updateErr) {
                                console.error("Error updating stock points:", updateErr);
                            }
                            console.log(`Updated ${updateResult?.updatedCount || 0} products with status 'Available' and Received_Status 'received'`);
                            
                            // After updating stock points, delete the assigned records if any
                            if (assigned_ids && assigned_ids.length > 0) {
                                returnToMainStockModel.deleteAssignedRecords(assigned_ids, (deleteErr, deleteResult) => {
                                    if (deleteErr) {
                                        console.error("Error deleting assigned records:", deleteErr);
                                    }
                                    console.log(`Deleted ${deleteResult?.deletedCount || 0} assigned records`);
                                    
                                    res.json({ 
                                        message: "Return to main stock completed successfully", 
                                        return_id: result.return_id,
                                        return_number: result.return_number,
                                        items_updated: updateResult?.updatedCount || 0,
                                        records_deleted: deleteResult?.deletedCount || 0
                                    });
                                });
                            } else {
                                res.json({ 
                                    message: "Return to main stock completed successfully", 
                                    return_id: result.return_id,
                                    return_number: result.return_number,
                                    items_updated: updateResult?.updatedCount || 0
                                });
                            }
                        }
                    );
                } else {
                    res.json({ 
                        message: "Return to main stock completed successfully", 
                        return_id: result.return_id,
                        return_number: result.return_number
                    });
                }
            }
        );
    } catch (error) {
        console.error("Error processing request:", error.message);
        res.status(400).json({ message: "Invalid data format", error: error.message });
    }
};

// =============================================
// GET ALL: Get all return transfers
// =============================================
exports.getAllReturnTransfers = (req, res) => {
    returnToMainStockModel.getAll((err, results) => {
        if (err) {
            console.error("Error fetching return transfers:", err);
            return res.status(500).json({ message: "Error fetching return transfers" });
        }
        res.json(results);
    });
};

// =============================================
// GET BY ID: Get return transfer by ID
// =============================================
exports.getReturnTransferById = (req, res) => {
    const { return_id } = req.params;

    if (!return_id) {
        return res.status(400).json({ message: "Return ID is required" });
    }

    returnToMainStockModel.getById(return_id, (err, result) => {
        if (err) {
            console.error("Error fetching return transfer:", err);
            return res.status(500).json({ message: "Error fetching return transfer" });
        }

        if (!result || !result.return_details) {
            return res.status(404).json({ message: "Return transfer not found" });
        }

        res.json(result);
    });
};

// =============================================
// UPDATE: Update return transfer
// =============================================
exports.updateReturnTransfer = (req, res) => {
    const { return_id } = req.params;
    const { status, remarks } = req.body;

    if (!return_id) {
        return res.status(400).json({ message: "Return ID is required" });
    }

    returnToMainStockModel.update(return_id, status, remarks, (err, result) => {
        if (err) {
            console.error("Error updating return transfer:", err);
            return res.status(500).json({ message: "Error updating return transfer" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Return transfer not found" });
        }

        res.json({ message: "Return transfer updated successfully" });
    });
};

// =============================================
// DELETE: Delete return transfer
// =============================================
exports.deleteReturnTransfer = (req, res) => {
    const { return_id } = req.params;

    if (!return_id) {
        return res.status(400).json({ message: "Return ID is required" });
    }

    returnToMainStockModel.delete(return_id, (err, result) => {
        if (err) {
            console.error("Error deleting return transfer:", err);
            return res.status(500).json({ message: "Error deleting return transfer" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Return transfer not found" });
        }

        res.json({ message: "Return transfer deleted successfully" });
    });
};

// =============================================
// GET LAST RETURN NUMBER
// =============================================
exports.getLastReturnNumber = (req, res) => {
    returnToMainStockModel.getLastReturnNumber((err, result) => {
        if (err) {
            console.error("Error fetching last return number:", err);
            return res.status(500).json({ message: "Error fetching last return number" });
        }
        res.json({ lastReturnNumber: result });
    });
};

// =============================================
// UPDATE STATUS: Update transfer status
// =============================================
exports.updateStatus = (req, res) => {
    const { return_id } = req.params;
    const { status } = req.body;

    if (!return_id) {
        return res.status(400).json({ message: "Return ID is required" });
    }

    returnToMainStockModel.updateStatus(return_id, status, (err, result) => {
        if (err) {
            console.error("Error updating status:", err);
            return res.status(500).json({ message: "Error updating status" });
        }

        res.json({ message: "Status updated successfully" });
    });
};

// =============================================
// GET PRODUCTS BY STOCK POINT (for return)
// =============================================
exports.getProductsByStockPoint = (req, res) => {
    const { stock_point_name } = req.query;
    
    if (!stock_point_name) {
        return res.status(400).json({ message: "Stock point name is required" });
    }
    
    returnToMainStockModel.getProductsByStockPoint(stock_point_name, (err, results) => {
        if (err) {
            console.error("Error fetching products by stock point:", err);
            return res.status(500).json({ message: "Error fetching products" });
        }
        res.json(results);
    });
};