const assignedSalesmanModel = require("../models/assignedSalesman");

exports.saveAssignedSalesman = (req, res) => {
  try {
    const { 
      transfer_data, 
      from_stock_point_id, 
      to_salesman_id,
      transfer_date,
      reference_number,
      remarks,
      created_by,
      from_user_id,
      to_user_id
    } = req.body;

    if (!transfer_data || !Array.isArray(transfer_data) || transfer_data.length === 0) {
      return res.status(400).json({ message: "No transfer data provided" });
    }

    if (!from_stock_point_id) {
      return res.status(400).json({ message: "From stock point is required" });
    }

    if (!to_salesman_id) {
      return res.status(400).json({ message: "To salesman is required" });
    }

    // Extract product codes from transfer_data for stock point update
    const productCodes = transfer_data.map(item => item.PCode_BarCode).filter(code => code);

    assignedSalesmanModel.insert(
      transfer_data,
      from_stock_point_id,
      to_salesman_id,
      transfer_date,
      reference_number,
      remarks,
      created_by,
      from_user_id,
      to_user_id,
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error saving assigned salesman data", error: err });
        }
        
        // After successful transfer, update stock points in opening_tags_entry
        if (productCodes.length > 0 && to_salesman_id) {
          assignedSalesmanModel.updateStockPointForSalesman(productCodes, to_salesman_id, (updateErr, updateResult) => {
            if (updateErr) {
              console.error("Error updating stock points for salesman:", updateErr);
              // Don't fail the whole transaction, just log the error
            }
            console.log(`Updated stock point for ${updateResult?.updatedCount || 0} products to salesman`);
            
            res.json({ 
              message: "Assigned to salesman completed successfully", 
              transfer_id: result.transfer_id,
              transfer_number: result.transfer_number,
              items_updated: updateResult?.updatedCount || 0
            });
          });
        } else {
          res.json({ 
            message: "Assigned to salesman completed successfully", 
            transfer_id: result.transfer_id,
            transfer_number: result.transfer_number
          });
        }
      }
    );
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(400).json({ message: "Invalid data format", error: error.message });
  }
};

exports.getAllAssignedTransfers = (req, res) => {
  assignedSalesmanModel.getAll((err, results) => {
    if (err) {
      console.error("Error fetching assigned transfers:", err);
      return res.status(500).json({ message: "Error fetching assigned transfers" });
    }
    res.json(results);
  });
};

exports.getAssignedTransferById = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  assignedSalesmanModel.getById(transfer_id, (err, result) => {
    if (err) {
      console.error("Error fetching assigned transfer:", err);
      return res.status(500).json({ message: "Error fetching assigned transfer" });
    }

    if (!result || !result.transfer_details) {
      return res.status(404).json({ message: "Assigned transfer not found" });
    }

    res.json(result);
  });
};

exports.updateAssignedTransfer = (req, res) => {
  const { transfer_id } = req.params;
  const { status, remarks } = req.body;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  assignedSalesmanModel.update(transfer_id, status, remarks, (err, result) => {
    if (err) {
      console.error("Error updating assigned transfer:", err);
      return res.status(500).json({ message: "Error updating assigned transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Assigned transfer not found" });
    }

    res.json({ message: "Assigned transfer updated successfully" });
  });
};

exports.deleteAssignedTransfer = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  assignedSalesmanModel.delete(transfer_id, (err, result) => {
    if (err) {
      console.error("Error deleting assigned transfer:", err);
      return res.status(500).json({ message: "Error deleting assigned transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Assigned transfer not found" });
    }

    res.json({ message: "Assigned transfer deleted successfully" });
  });
};

// In assignedSalesmanController.js - already correct, but ensure this:
exports.getLastAssignedNumber = (req, res) => {
  assignedSalesmanModel.getLastAssignedNumber((err, result) => {
    if (err) {
      console.error("Error fetching last assigned number:", err);
      return res.status(500).json({ message: "Error fetching last assigned number" });
    }
    res.json({ lastAssignedNumber: result });
  });
};


exports.getSalesmen = (req, res) => {
  assignedSalesmanModel.getSalesmen((err, results) => {
    if (err) {
      console.error("Error fetching salesmen:", err);
      return res.status(500).json({ message: "Error fetching salesmen" });
    }
    res.json(results);
  });
};

exports.updateStatus = (req, res) => {
  const { transfer_id } = req.params;
  const { status } = req.body;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  assignedSalesmanModel.updateStatus(transfer_id, status, (err, result) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).json({ message: "Error updating status" });
    }

    res.json({ message: "Status updated successfully" });
  });
};