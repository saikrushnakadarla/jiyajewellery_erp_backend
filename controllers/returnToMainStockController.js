const returnToMainStockModel = require("../models/returnToMainStockModel");
const fs = require('fs');
const path = require('path');

/**
 * Save base64 image to file and return the relative URL path.
 * If already a file path, return it unchanged.
 */
const saveImageFile = (base64String, returnNumber, type = 'item', itemIndex = 0) => {
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

    // FIXED: Correct path - go up one level to project root, then into uploads/return-to-main-stock
    const uploadDir = path.join(__dirname, '../uploads/return-to-main-stock');
    console.log(`📁 Upload directory path: ${uploadDir}`);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created directory: ${uploadDir}`);
    }

    // Generate unique filename based on type
    const timestamp = Date.now();
    let filename;
    if (type === 'capture') {
      filename = `capture_${returnNumber}_${timestamp}.${imageType}`;
    } else {
      filename = `return_${returnNumber}_item_${itemIndex}_${timestamp}.${imageType}`;
    }
    const filePath = path.join(uploadDir, filename);
    console.log(`📁 Saving image to: ${filePath}`);

    // Write file
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Image saved: ${filePath}`);

    // Return relative URL for database (with leading slash)
    return `/uploads/return-to-main-stock/${filename}`;
  } catch (error) {
    console.error('❌ Error saving image:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return null;
  }
};

/**
 * Generate a unique return number if not provided.
 */
const generateReturnNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RTN${year}${month}${day}${random}`;
};

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
            assigned_ids = [],
            capture_image
        } = req.body;

        if (!return_data || !Array.isArray(return_data) || return_data.length === 0) {
            return res.status(400).json({ message: "No return data provided" });
        }

        if (!from_stock_point_id) {
            return res.status(400).json({ message: "From stock point is required" });
        }

        // Determine return number
        const return_number = reference_number || generateReturnNumber();
        console.log(`📦 Processing return: ${return_number}`);

        // --- Process capture image (single image for the whole transfer) ---
        let savedCaptureImagePath = null;
        if (capture_image) {
            console.log(`📷 Saving capture image for return ${return_number}...`);
            savedCaptureImagePath = saveImageFile(capture_image, return_number, 'capture');
            console.log(`📷 Capture image saved at: ${savedCaptureImagePath}`);
        } else {
            console.log(`📷 No capture image provided`);
        }

        // --- Process images for each item: convert base64 to file paths ---
        const processedReturnData = return_data.map((item, index) => {
            const processedItem = { ...item };

            // If item has its own image
            if (item.image) {
                console.log(`🖼️ Item ${index} has image, saving...`);
                const savedPath = saveImageFile(item.image, return_number, 'item', index);
                processedItem.image = savedPath;
            } else {
                console.log(`🖼️ Item ${index} has no image`);
            }

            // Ensure packet_barcode is preserved
            if (item.packet_barcode) {
                console.log(`📦 Item ${index} has packet barcode: ${item.packet_barcode}`);
            }

            return processedItem;
        });

        // Insert return records with capture image
        returnToMainStockModel.insert(
            processedReturnData,
            from_stock_point_id,
            to_stock_point_id || null,
            return_date,
            return_number,
            remarks,
            created_by,
            from_user_id,
            to_user_id,
            savedCaptureImagePath,
            (err, result) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({ message: "Error saving return to main stock data", error: err });
                }
                
                // After successful transfer, update opening_tags_entry
                if (processedReturnData.length > 0) {
                    returnToMainStockModel.updateStockPointForReturn(
                        processedReturnData,
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
                                        capture_image: savedCaptureImagePath,
                                        items_updated: updateResult?.updatedCount || 0,
                                        records_deleted: deleteResult?.deletedCount || 0
                                    });
                                });
                            } else {
                                res.json({ 
                                    message: "Return to main stock completed successfully", 
                                    return_id: result.return_id,
                                    return_number: result.return_number,
                                    capture_image: savedCaptureImagePath,
                                    items_updated: updateResult?.updatedCount || 0
                                });
                            }
                        }
                    );
                } else {
                    res.json({ 
                        message: "Return to main stock completed successfully", 
                        return_id: result.return_id,
                        return_number: result.return_number,
                        capture_image: savedCaptureImagePath
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