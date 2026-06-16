const receivedSalesmanModel = require("../models/receivedSalesmanModal");

// Replace the saveReceivedSalesman function in receivedSalesmanController.js

// Replace the saveReceivedSalesman function
exports.saveReceivedSalesman = (req, res) => {
  try {
    const { 
      transfer_data, 
      from_salesman_id,
      to_stock_point_id,
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

    if (!from_salesman_id) {
      return res.status(400).json({ message: "From salesman is required" });
    }

    if (!to_stock_point_id) {
      return res.status(400).json({ message: "To stock point is required" });
    }

    // Extract product codes and assigned IDs
    const productCodes = transfer_data.map(item => item.PCode_BarCode).filter(code => code);
    const assignedIds = transfer_data.map(item => item.assigned_id).filter(id => id);

    // Insert transfer records
    receivedSalesmanModel.insert(
      transfer_data,
      from_salesman_id,
      to_stock_point_id,
      transfer_date,
      reference_number,
      remarks,
      created_by,
      from_user_id,
      to_user_id,
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error saving received salesman data", error: err });
        }
        
        // After successful transfer, update stock points in opening_tags_entry
        if (transfer_data.length > 0 && to_stock_point_id) {
          // Pass the entire transfer_data to process each product individually
          receivedSalesmanModel.updateStockPointWithStatus(
            transfer_data,  // Pass the full transfer data with is_packet_selection flags
            to_stock_point_id, 
            to_user_id,
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error("Error updating stock points:", updateErr);
                // Don't fail the whole transaction, just log the error
              }
              console.log(`Updated ${updateResult?.updatedCount || 0} products with individual statuses`);
              
              // After updating stock points, delete the assigned records
              if (assignedIds.length > 0) {
                receivedSalesmanModel.deleteAssignedRecords(assignedIds, (deleteErr, deleteResult) => {
                  if (deleteErr) {
                    console.error("Error deleting assigned records:", deleteErr);
                  }
                  console.log(`Deleted ${deleteResult?.deletedCount || 0} assigned records`);
                  
                  res.json({ 
                    message: "Received from salesman completed successfully", 
                    transfer_id: result.transfer_id,
                    transfer_number: result.transfer_number,
                    items_updated: updateResult?.updatedCount || 0,
                    records_deleted: deleteResult?.deletedCount || 0
                  });
                });
              } else {
                res.json({ 
                  message: "Received from salesman completed successfully", 
                  transfer_id: result.transfer_id,
                  transfer_number: result.transfer_number,
                  items_updated: updateResult?.updatedCount || 0
                });
              }
            }
          );
        } else {
          res.json({ 
            message: "Received from salesman completed successfully", 
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

exports.getAllReceivedTransfers = (req, res) => {
  receivedSalesmanModel.getAll((err, results) => {
    if (err) {
      console.error("Error fetching received transfers:", err);
      return res.status(500).json({ message: "Error fetching received transfers" });
    }
    res.json(results);
  });
};

exports.getReceivedTransferById = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  receivedSalesmanModel.getById(transfer_id, (err, result) => {
    if (err) {
      console.error("Error fetching received transfer:", err);
      return res.status(500).json({ message: "Error fetching received transfer" });
    }

    if (!result || !result.transfer_details) {
      return res.status(404).json({ message: "Received transfer not found" });
    }

    res.json(result);
  });
};

exports.updateReceivedTransfer = (req, res) => {
  const { transfer_id } = req.params;
  const { status, remarks } = req.body;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  receivedSalesmanModel.update(transfer_id, status, remarks, (err, result) => {
    if (err) {
      console.error("Error updating received transfer:", err);
      return res.status(500).json({ message: "Error updating received transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Received transfer not found" });
    }

    res.json({ message: "Received transfer updated successfully" });
  });
};

exports.deleteReceivedTransfer = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  receivedSalesmanModel.delete(transfer_id, (err, result) => {
    if (err) {
      console.error("Error deleting received transfer:", err);
      return res.status(500).json({ message: "Error deleting received transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Received transfer not found" });
    }

    res.json({ message: "Received transfer deleted successfully" });
  });
};

exports.getLastReceivedNumber = (req, res) => {
  receivedSalesmanModel.getLastReceivedNumber((err, result) => {
    if (err) {
      console.error("Error fetching last received number:", err);
      return res.status(500).json({ message: "Error fetching last received number" });
    }
    res.json({ lastReceivedNumber: result });
  });
};

exports.getSalesmen = (req, res) => {
  receivedSalesmanModel.getSalesmen((err, results) => {
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

  receivedSalesmanModel.updateStatus(transfer_id, status, (err, result) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).json({ message: "Error updating status" });
    }

    res.json({ message: "Status updated successfully" });
  });
};

exports.getAssignedProductsBySalesman = (req, res) => {
  const { salesman_id } = req.query;
  
  if (!salesman_id) {
    return res.status(400).json({ message: "Salesman ID is required" });
  }
  
  receivedSalesmanModel.getProductsBySalesman(salesman_id, (err, results) => {
    if (err) {
      console.error("Error fetching assigned products:", err);
      return res.status(500).json({ message: "Error fetching assigned products" });
    }
    res.json(results);
  });
};