const stockTransferModel = require("../../models/stockTransfer/stockTransfer");
const fs = require('fs');
const path = require('path');

/**
 * Save base64 image to file and return the relative URL path.
 * If already a file path, return it unchanged.
 */
const saveImageFile = (base64String, transferNumber, itemIndex) => {
  if (!base64String) return null;

  // Already a file path (not base64)
  if (!base64String.startsWith('data:image')) {
    console.log(`Image already a file path: ${base64String}`);
    return base64String;
  }

  try {
    // Extract image type and data
    const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.error('Invalid base64 image format');
      return null;
    }

    const imageType = matches[1]; // e.g., jpg, png, jpeg
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');

    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../../uploads/stock-transfers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Created directory: ${uploadDir}`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `transfer_${transferNumber}_item_${itemIndex}_${timestamp}.${imageType}`;
    const filePath = path.join(uploadDir, filename);

    // Write file
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Image saved: ${filePath}`);

    // Return relative URL for database
    return `/uploads/stock-transfers/${filename}`;
  } catch (error) {
    console.error('❌ Error saving image:', error.message);
    return null;
  }
};

/**
 * Generate a unique transfer number if not provided.
 */
const generateTransferNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `STF${year}${month}${day}${random}`;
};

/**
 * Save a new stock transfer.
 */
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
      created_by,
      from_user_id,
      to_user_id
    } = req.body;

    // --- Validation ---
    if (!transfer_data || !Array.isArray(transfer_data) || transfer_data.length === 0) {
      return res.status(400).json({ message: "No transfer data provided" });
    }

    if (!from_warehouse_id || !to_warehouse_id) {
      return res.status(400).json({ message: "From and To warehouses are required" });
    }

    // Determine transfer number
    const transfer_number = reference_number || generateTransferNumber();
    console.log(`📦 Processing transfer: ${transfer_number}`);

    // --- Process images: convert base64 to file paths ---
    const processedTransferData = transfer_data.map((item, index) => {
      const processedItem = { ...item };

      if (item.image) {
        console.log(`🖼️ Item ${index} has image, saving...`);
        const savedPath = saveImageFile(item.image, transfer_number, index);
        processedItem.image = savedPath; // store path, not base64
      } else {
        console.log(`ℹ️ Item ${index} has no image.`);
      }

      return processedItem;
    });

    // Extract product codes for stock point update
    const productCodes = processedTransferData
      .map(item => item.PCode_BarCode)
      .filter(code => code);

    // --- Insert into database ---
    stockTransferModel.insert(
      processedTransferData,
      from_warehouse_id,
      to_warehouse_id,
      from_stock_point_id,
      to_stock_point_id,
      transfer_date,
      transfer_number,
      remarks,
      created_by,
      from_user_id,
      to_user_id,
      (err, result) => {
        if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ message: "Error saving stock transfer data", error: err });
        }

        // Update stock points in opening_tags_entry
        if (productCodes.length > 0 && to_stock_point_id) {
          stockTransferModel.updateStockPointForTransfer(productCodes, to_stock_point_id, (updateErr, updateResult) => {
            if (updateErr) {
              console.error("❌ Error updating stock points:", updateErr);
            }
            console.log(`✅ Updated stock point for ${updateResult?.updatedCount || 0} products`);

            res.json({
              message: "Stock transfer completed successfully",
              transfer_id: result.transfer_id,
              transfer_number: result.transfer_number,
              stock_points_updated: updateResult?.updatedCount || 0
            });
          });
        } else {
          res.json({
            message: "Stock transfer completed successfully",
            transfer_id: result.transfer_id,
            transfer_number: result.transfer_number
          });
        }
      }
    );
  } catch (error) {
    console.error("❌ Error processing request:", error.message);
    res.status(400).json({ message: "Invalid data format", error: error.message });
  }
};

/**
 * Get the last transfer number (for generating the next one).
 */
exports.getLastTransferNumber = (req, res) => {
  stockTransferModel.getLastTransferNumber((err, result) => {
    if (err) {
      console.error("❌ Error fetching last transfer number:", err);
      return res.status(500).json({ message: "Error fetching last transfer number" });
    }
    res.json({ lastTransferNumber: result });
  });
};

/**
 * Get all stock transfers.
 */
exports.getAllStockTransfers = (req, res) => {
  stockTransferModel.getAll((err, results) => {
    if (err) {
      console.error("❌ Error fetching stock transfers:", err);
      return res.status(500).json({ message: "Error fetching stock transfers" });
    }
    res.json(results);
  });
};

/**
 * Get a single stock transfer by ID.
 */
exports.getStockTransferById = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  stockTransferModel.getById(transfer_id, (err, result) => {
    if (err) {
      console.error("❌ Error fetching stock transfer:", err);
      return res.status(500).json({ message: "Error fetching stock transfer" });
    }

    if (!result || !result.transfer_details) {
      return res.status(404).json({ message: "Stock transfer not found" });
    }

    res.json(result);
  });
};

/**
 * Update a stock transfer (status/remarks).
 */
exports.updateStockTransfer = (req, res) => {
  const { transfer_id } = req.params;
  const { status, remarks } = req.body;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  stockTransferModel.update(transfer_id, status, remarks, (err, result) => {
    if (err) {
      console.error("❌ Error updating stock transfer:", err);
      return res.status(500).json({ message: "Error updating stock transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock transfer not found" });
    }

    res.json({ message: "Stock transfer updated successfully" });
  });
};

/**
 * Delete a stock transfer.
 */
exports.deleteStockTransfer = (req, res) => {
  const { transfer_id } = req.params;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  stockTransferModel.delete(transfer_id, (err, result) => {
    if (err) {
      console.error("❌ Error deleting stock transfer:", err);
      return res.status(500).json({ message: "Error deleting stock transfer" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock transfer not found" });
    }

    res.json({ message: "Stock transfer deleted successfully" });
  });
};

exports.getLastTransferNumber = (req, res) => {
  stockTransferModel.getLastTransferNumber((err, result) => {
    if (err) {
      console.error("Error fetching last transfer number:", err);
      return res.status(500).json({ message: "Error fetching last transfer number" });
    }
    res.json({ lastTransferNumber: result });
  });
};