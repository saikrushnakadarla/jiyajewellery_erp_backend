const stockTransferModel = require("../../models/stockTransfer/stockTransfer");

exports.saveStockTransfer = (req, res) => {
  try {
    const { 
      transfer_data, 
      from_warehouse_id, 
      to_warehouse_id, 
      from_stock_point_id, 
      to_stock_point_id,
      transfer_date,
      reference_number,
      remarks,
      created_by 
    } = req.body;

    if (!transfer_data || !Array.isArray(transfer_data) || transfer_data.length === 0) {
      return res.status(400).json({ message: "No transfer data provided" });
    }

    if (!from_warehouse_id || !to_warehouse_id) {
      return res.status(400).json({ message: "From and To warehouses are required" });
    }

    stockTransferModel.insert(
      transfer_data,
      from_warehouse_id,
      to_warehouse_id,
      from_stock_point_id,
      to_stock_point_id,
      transfer_date,
      reference_number,
      remarks,
      created_by,
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error saving stock transfer data", error: err });
        }
        res.json({ 
          message: "Stock transfer completed successfully", 
          transfer_id: result.transfer_id,
          transfer_number: result.transfer_number
        });
      }
    );
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(400).json({ message: "Invalid data format", error: error.message });
  }
};

exports.getAllStockTransfers = (req, res) => {
  stockTransferModel.getAll((err, results) => {
    if (err) {
      console.error("Error fetching stock transfers:", err);
      return res.status(500).json({ message: "Error fetching stock transfers" });
    }
    res.json(results);
  });
};

exports.getStockTransferById = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  stockTransferModel.getById(transfer_id, (err, result) => {
    if (err) {
      console.error("Error fetching stock transfer:", err);
      return res.status(500).json({ message: "Error fetching stock transfer" });
    }

    if (!result || !result.transfer_details) {
      return res.status(404).json({ message: "Stock transfer not found" });
    }

    res.json(result);
  });
};

exports.updateStockTransfer = (req, res) => {
  const { transfer_id } = req.params;
  const { status, remarks } = req.body;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  stockTransferModel.update(transfer_id, status, remarks, (err, result) => {
    if (err) {
      console.error("Error updating stock transfer:", err);
      return res.status(500).json({ message: "Error updating stock transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock transfer not found" });
    }

    res.json({ message: "Stock transfer updated successfully" });
  });
};

exports.deleteStockTransfer = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  stockTransferModel.delete(transfer_id, (err, result) => {
    if (err) {
      console.error("Error deleting stock transfer:", err);
      return res.status(500).json({ message: "Error deleting stock transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock transfer not found" });
    }

    res.json({ message: "Stock transfer deleted successfully" });
  });
};