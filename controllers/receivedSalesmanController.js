const receivedSalesmanModel = require("../models/receivedSalesmanModal");
const fs = require('fs');
const path = require('path');

/**
 * Save base64 image to file and return the relative URL path.
 * If already a file path, return it unchanged.
 */
const saveImageFile = (base64String, receivedNumber, type = 'item', itemIndex = 0) => {
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

    // FIXED: Correct path - go up one level to project root, then into uploads/received-salesman
    const uploadDir = path.join(__dirname, '../uploads/received-salesman');
    console.log(`📁 Upload directory path: ${uploadDir}`);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created directory: ${uploadDir}`);
    }

    // Generate unique filename based on type
    const timestamp = Date.now();
    let filename;
    if (type === 'capture') {
      filename = `capture_${receivedNumber}_${timestamp}.${imageType}`;
    } else {
      filename = `received_${receivedNumber}_item_${itemIndex}_${timestamp}.${imageType}`;
    }
    const filePath = path.join(uploadDir, filename);
    console.log(`📁 Saving image to: ${filePath}`);

    // Write file
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Image saved: ${filePath}`);

    // Return relative URL for database (with leading slash)
    return `/uploads/received-salesman/${filename}`;
  } catch (error) {
    console.error('❌ Error saving image:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return null;
  }
};

/**
 * Generate a unique received number if not provided.
 */
const generateReceivedNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RCN${year}${month}${day}${random}`;
};

// Save Received Salesman with Capture Image and StockOutWard fields
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
      to_user_id,
      capture_image,
      // New StockOutWard fields
      stock_outward_barcode,
      stock_outward_gross_wt,
      stock_outward_type,
      stock_outward_packet_barcode,
      // NEW: capture_weight_of_bag
      capture_weight_of_bag
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

    // Determine received number
    const received_number = reference_number || generateReceivedNumber();
    console.log(`📦 Processing received: ${received_number}`);
    console.log(`📦 StockOutWard Barcode: ${stock_outward_barcode}`);
    console.log(`📦 StockOutWard Gross WT: ${stock_outward_gross_wt}`);
    console.log(`📦 StockOutWard Type: ${stock_outward_type}`);
    console.log(`📦 StockOutWard Packet Barcode: ${stock_outward_packet_barcode}`);
    console.log(`📦 Capture Weight of Bag: ${capture_weight_of_bag || 0}`);

    // --- Process capture image (single image for the whole transfer) ---
    let savedCaptureImagePath = null;
    if (capture_image) {
      console.log(`📷 Saving capture image for received ${received_number}...`);
      console.log(`📷 Capture image type: ${typeof capture_image}, length: ${capture_image ? capture_image.length : 0}`);
      savedCaptureImagePath = saveImageFile(capture_image, received_number, 'capture');
      console.log(`📷 Capture image saved at: ${savedCaptureImagePath}`);
    } else {
      console.log(`📷 No capture image provided`);
    }

    // --- Process images for each item: convert base64 to file paths ---
    const processedTransferData = transfer_data.map((item, index) => {
      const processedItem = { ...item };

      // If item has its own image
      if (item.image) {
        console.log(`🖼️ Item ${index} has image, saving...`);
        const savedPath = saveImageFile(item.image, received_number, 'item', index);
        processedItem.image = savedPath;
      } else {
        console.log(`🖼️ Item ${index} has no image`);
      }

      return processedItem;
    });

    // Extract product codes
    const productCodes = processedTransferData.map(item => item.PCode_BarCode).filter(code => code);

    // Insert transfer records with capture image, StockOutWard fields, and capture_weight_of_bag
    receivedSalesmanModel.insert(
      processedTransferData,
      from_salesman_id,
      to_stock_point_id,
      transfer_date,
      received_number,
      remarks,
      created_by,
      from_user_id,
      to_user_id,
      savedCaptureImagePath,
      stock_outward_barcode,
      stock_outward_gross_wt,
      stock_outward_type,
      stock_outward_packet_barcode,
      capture_weight_of_bag, // NEW
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error saving received salesman data", error: err });
        }
        
        // After successful transfer, update stock points in opening_tags_entry
        if (processedTransferData.length > 0 && to_stock_point_id) {
          // Pass the entire transfer_data to process each product individually
          receivedSalesmanModel.updateStockPointWithStatus(
            processedTransferData,  // Pass the full transfer data with is_packet_selection flags
            to_stock_point_id, 
            to_user_id,
            (updateErr, updateResult) => {
              if (updateErr) {
                console.error("Error updating stock points:", updateErr);
                // Don't fail the whole transaction, just log the error
              }
              console.log(`Updated ${updateResult?.updatedCount || 0} products with individual statuses`);
              
              res.json({ 
                message: "Received from salesman completed successfully", 
                transfer_id: result.transfer_id,
                transfer_number: result.transfer_number,
                capture_image: savedCaptureImagePath,
                stock_outward_barcode: stock_outward_barcode,
                stock_outward_gross_wt: stock_outward_gross_wt,
                stock_outward_type: stock_outward_type,
                stock_outward_packet_barcode: stock_outward_packet_barcode,
                capture_weight_of_bag: capture_weight_of_bag || 0,
                items_updated: updateResult?.updatedCount || 0
              });
            }
          );
        } else {
          res.json({ 
            message: "Received from salesman completed successfully", 
            transfer_id: result.transfer_id,
            transfer_number: result.transfer_number,
            capture_image: savedCaptureImagePath,
            stock_outward_barcode: stock_outward_barcode,
            stock_outward_gross_wt: stock_outward_gross_wt,
            stock_outward_type: stock_outward_type,
            stock_outward_packet_barcode: stock_outward_packet_barcode,
            capture_weight_of_bag: capture_weight_of_bag || 0
          });
        }
      }
    );
  } catch (error) {
    console.error("Error processing request:", error.message);
    console.error("Stack trace:", error.stack);
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
  const { salesman_id, from_stock_point_id } = req.query;

  if (!salesman_id) {
    return res.status(400).json({ message: "Salesman ID is required" });
  }

  receivedSalesmanModel.getProductsBySalesman(salesman_id, from_stock_point_id, (err, results) => {
    if (err) {
      console.error("Error fetching assigned products:", err);
      return res.status(500).json({ message: "Error fetching assigned products" });
    }
    res.json(results);
  });
};



// ==================== UPDATE ITEM WEIGHT ====================
exports.updateItemWeight = (req, res) => {
  const { item_id } = req.params;
  const { 
    total_grams, 
    grams, 
    milligrams, 
    raw_text, 
    confidence 
  } = req.body;

  if (!item_id) {
    return res.status(400).json({ message: "Item ID is required" });
  }

  if (!total_grams && !grams && !milligrams) {
    return res.status(400).json({ message: "At least one weight value is required" });
  }

  const weightData = {
    total_grams: parseFloat(total_grams) || 0,
    grams: parseInt(grams) || 0,
    milligrams: parseInt(milligrams) || 0,
    raw_text: raw_text || null,
    confidence: parseInt(confidence) || 100
  };

  receivedSalesmanModel.updateItemWeight(item_id, weightData, (err, result) => {
    if (err) {
      console.error("Error updating item weight:", err);
      return res.status(500).json({ message: "Error updating item weight", error: err.message });
    }

    res.json({ 
      success: true, 
      message: "Weight updated successfully",
      item_id: item_id,
      weight_data: weightData
    });
  });
};

// ==================== GET ITEM WEIGHT ====================
exports.getItemWeight = (req, res) => {
  const { item_id } = req.params;

  if (!item_id) {
    return res.status(400).json({ message: "Item ID is required" });
  }

  receivedSalesmanModel.getItemWeight(item_id, (err, results) => {
    if (err) {
      console.error("Error fetching item weight:", err);
      return res.status(500).json({ message: "Error fetching item weight", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ 
      success: true, 
      data: results[0]
    });
  });
};

// ==================== GET ALL ITEMS WITH WEIGHTS FOR ASSIGNMENT ====================
exports.getItemsWithWeightsByAssignment = (req, res) => {
  const { received_id } = req.params;

  if (!received_id) {
    return res.status(400).json({ message: "Received ID is required" });
  }

  receivedSalesmanModel.getItemsWithWeightsByAssignment(received_id, (err, results) => {
    if (err) {
      console.error("Error fetching items with weights:", err);
      return res.status(500).json({ message: "Error fetching items", error: err.message });
    }

    res.json({ 
      success: true, 
      data: results,
      count: results.length
    });
  });
};