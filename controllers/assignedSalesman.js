const assignedSalesmanModel = require("../models/assignedSalesman");
const fs = require('fs');
const path = require('path');

/**
 * Save base64 image to file and return the relative URL path.
 * If already a file path, return it unchanged.
 */
const saveImageFile = (base64String, assignedNumber, type = 'item', itemIndex = 0) => {
  if (!base64String) return null;

  // Already a file path (not base64) - return as is
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

    // Ensure uploads directory exists - FIXED: Correct path
    const uploadDir = path.join(__dirname, '../uploads/assigned-salesman');
    console.log(`Upload directory path: ${uploadDir}`);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created directory: ${uploadDir}`);
    }

    // Generate unique filename based on type
    const timestamp = Date.now();
    let filename;
    if (type === 'capture') {
      filename = `capture_${assignedNumber}_${timestamp}.${imageType}`;
    } else {
      filename = `assigned_${assignedNumber}_item_${itemIndex}_${timestamp}.${imageType}`;
    }
    const filePath = path.join(uploadDir, filename);
    console.log(`📁 Saving image to: ${filePath}`);

    // Write file
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Image saved: ${filePath}`);

    // Return relative URL for database (with leading slash)
    return `/uploads/assigned-salesman/${filename}`;
  } catch (error) {
    console.error('❌ Error saving image:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return null;
  }
};

/**
 * Generate a unique assigned number if not provided.
 */
const generateAssignedNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ASN${year}${month}${day}${random}`;
};

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
      to_user_id,
      capture_image  // Capture image from Customer Details
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

    // Determine assigned number
    const assigned_number = reference_number || generateAssignedNumber();
    console.log(`📦 Processing assignment: ${assigned_number}`);

    // --- Process capture image (single image for the whole assignment) ---
    let savedCaptureImagePath = null;
    if (capture_image) {
      console.log(`📷 Saving capture image for assignment ${assigned_number}...`);
      console.log(`📷 Capture image type: ${typeof capture_image}, length: ${capture_image ? capture_image.length : 0}`);
      savedCaptureImagePath = saveImageFile(capture_image, assigned_number, 'capture');
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
        const savedPath = saveImageFile(item.image, assigned_number, 'item', index);
        processedItem.image = savedPath;
      } else {
        console.log(`🖼️ Item ${index} has no image`);
      }

      return processedItem;
    });

    // Extract product codes from transfer_data for user_id update
    const productCodes = processedTransferData.map(item => item.PCode_BarCode).filter(code => code);

    assignedSalesmanModel.insert(
      processedTransferData,
      from_stock_point_id,
      to_salesman_id,
      transfer_date,
      assigned_number,
      remarks,
      created_by,
      from_user_id,
      to_user_id,
      savedCaptureImagePath,  // Pass capture image path
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error saving assigned salesman data", error: err });
        }
        
        // After successful transfer, update user_id in opening_tags_entry
        if (productCodes.length > 0 && to_salesman_id) {
          assignedSalesmanModel.updateStockPointForSalesman(productCodes, to_salesman_id, (updateErr, updateResult) => {
            if (updateErr) {
              console.error("Error updating user_id for salesman:", updateErr);
            }
            console.log(`Updated user_id for ${updateResult?.updatedCount || 0} products (Stock_Point unchanged)`);
            
            res.json({ 
              message: "Assigned to salesman completed successfully", 
              transfer_id: result.transfer_id,
              transfer_number: result.transfer_number,
              capture_image: savedCaptureImagePath,
              items_updated: updateResult?.updatedCount || 0
            });
          });
        } else {
          res.json({ 
            message: "Assigned to salesman completed successfully", 
            transfer_id: result.transfer_id,
            transfer_number: result.transfer_number,
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

exports.getAssignedProductsBySalesman = (req, res) => {
  const { salesman_id } = req.query;
  
  if (!salesman_id) {
    return res.status(400).json({ message: "Salesman ID is required" });
  }
  
  assignedSalesmanModel.getProductsBySalesman(salesman_id, (err, results) => {
    if (err) {
      console.error("Error fetching assigned products:", err);
      return res.status(500).json({ message: "Error fetching assigned products" });
    }
    res.json(results);
  });
};