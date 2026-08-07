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

    // Ensure uploads directory exists
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

// Cache to prevent duplicate notifications
const notificationCache = new Set();

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
      capture_image,
      item_gross_total,
      packet_gross_total,
      total_weight_with_bag
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

    const assigned_number = reference_number || generateAssignedNumber();
    console.log(`📦 Processing assignment: ${assigned_number}`);

    let savedCaptureImagePath = null;
    if (capture_image) {
      savedCaptureImagePath = saveImageFile(capture_image, assigned_number, 'capture');
    }

    // Process images for items
    const processedTransferData = transfer_data.map((item, index) => {
      const processedItem = { ...item };
      if (item.image) {
        const savedPath = saveImageFile(item.image, assigned_number, 'item', index);
        processedItem.image = savedPath;
      }
      return processedItem;
    });

    // Generate a unique notification key to prevent duplicates
    const notificationKey = `assignment_${assigned_number}_${to_salesman_id}`;
    
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
      savedCaptureImagePath,
      item_gross_total || 0,
      packet_gross_total || 0,
      total_weight_with_bag || 0,
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ message: "Error saving assigned salesman data", error: err });
        }
        
        // Send notification to salesman about pending assignment (ONLY ONCE)
        if (to_salesman_id && !notificationCache.has(notificationKey)) {
          notificationCache.add(notificationKey);
          // Clear cache after 10 seconds to allow future notifications
          setTimeout(() => {
            notificationCache.delete(notificationKey);
          }, 10000);
          
          createSalesmanAssignmentNotification(
            to_salesman_id,
            assigned_number,
            processedTransferData,
            from_stock_point_id,
            result.transfer_id
          );
        }
        
        res.json({ 
          message: "Assignment created successfully. Waiting for salesman approval.", 
          transfer_id: result.transfer_id,
          transfer_number: result.transfer_number,
          salesman_status: 'pending',
          item_gross_total: item_gross_total || 0,
          packet_gross_total: packet_gross_total || 0,
          total_weight_with_bag: total_weight_with_bag || 0
        });
      }
    );
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(400).json({ message: "Invalid data format", error: error.message });
  }
};

// Function to create notification for salesman (UPDATED to include transfer_id)
const createSalesmanAssignmentNotification = (salesmanId, assignedNumber, transferData, fromStockPointId, transferId) => {
  const db = require("../db");
  
  // Check if notification already exists for this assignment
  const checkSql = `SELECT id FROM notifications WHERE user_id = ? AND related_id = ? AND type = 'salesman_assignment' AND is_read = 0`;
  db.query(checkSql, [salesmanId, transferId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking existing notification:', checkErr);
      return;
    }
    
    // If notification already exists, don't create duplicate
    if (checkResults.length > 0) {
      console.log(`⚠️ Notification already exists for assignment ${assignedNumber}, skipping duplicate`);
      return;
    }
    
    db.query(
      'SELECT account_name FROM account_details WHERE account_id = ?',
      [salesmanId],
      (err, salesmanResult) => {
        if (err) {
          console.error('Error fetching salesman:', err);
          return;
        }
        
        const salesmanName = salesmanResult.length > 0 ? salesmanResult[0].account_name : 'Salesman';
        const itemCount = transferData.length;
        const productNames = transferData.map(item => item.product_name).filter(Boolean).join(', ');
        const firstProducts = productNames.substring(0, 100) + (productNames.length > 100 ? '...' : '');
        
        db.query(
          'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
          [fromStockPointId],
          (stockErr, stockResult) => {
            const stockPointName = stockErr || stockResult.length === 0 ? 'Stock Room' : stockResult[0].stock_point_name;
            
            // Create a single comprehensive notification with all details
            const title = `📦 New Assignment #${assignedNumber}`;
            const message = `You have ${itemCount} new item(s) assigned from ${stockPointName}. Products: ${firstProducts}. Please review and accept.`;
            
            db.query(
              `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
               VALUES (?, 'salesman', ?, ?, 'salesman_assignment', ?, NOW())`,
              [salesmanId, title, message, transferId],
              (notifErr) => {
                if (notifErr) {
                  console.error('Error creating notification:', notifErr);
                } else {
                  console.log(`✅ Single notification sent to salesman ${salesmanId} for ${assignedNumber}`);
                }
              }
            );
          }
        );
      }
    );
  });
};

// ==================== APPROVE / REJECT ====================
exports.updateSalesmanStatus = (req, res) => {
  const { transfer_id } = req.params;
  const { status } = req.body;

  if (!transfer_id) {
    return res.status(400).json({ message: "Transfer ID is required" });
  }

  if (!status || !['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
  }

  assignedSalesmanModel.getById(transfer_id, (err, result) => {
    if (err) {
      console.error("Error fetching transfer:", err);
      return res.status(500).json({ message: "Error fetching transfer" });
    }

    if (!result || !result.transfer_details) {
      return res.status(404).json({ message: "Transfer not found" });
    }

    const transferDetails = result.transfer_details;
    const salesmanId = transferDetails.to_salesman_id;

    assignedSalesmanModel.updateSalesmanStatus(transfer_id, status, (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Error updating status:", updateErr);
        return res.status(500).json({ message: "Error updating status" });
      }

      // If accepted, update stock point
      if (status === 'accepted' && updateResult && updateResult.itemCount > 0) {
        // Get items to get product codes
        assignedSalesmanModel.getById(transfer_id, (getErr, getResult) => {
          if (!getErr && getResult && getResult.transfer_items) {
            const productCodes = getResult.transfer_items.map(item => item.PCode_BarCode).filter(Boolean);
            
            if (productCodes.length > 0 && salesmanId) {
              assignedSalesmanModel.updateStockPointForSalesman(productCodes, salesmanId, (stockErr, stockResult) => {
                if (stockErr) {
                  console.error("Error updating stock:", stockErr);
                } else {
                  console.log(`Updated stock for ${stockResult?.updatedCount || 0} products`);
                }
              });
            }
          }
        });
        
        createSalesmanApprovalNotification(salesmanId, transferDetails.assigned_number, 'accepted', transfer_id);
      } else {
        createSalesmanApprovalNotification(salesmanId, transferDetails.assigned_number, 'rejected', transfer_id);
      }

      res.json({ 
        message: `Assignment ${status} successfully`, 
        transfer_id: transfer_id,
        status: status
      });
    });
  });
};

// Function for approval notification
const createSalesmanApprovalNotification = (salesmanId, assignedNumber, status, transferId) => {
  const db = require("../db");
  
  db.query(
    'SELECT account_name FROM account_details WHERE account_id = ?',
    [salesmanId],
    (err, salesmanResult) => {
      if (err) {
        console.error('Error fetching salesman:', err);
        return;
      }
      
      const salesmanName = salesmanResult.length > 0 ? salesmanResult[0].account_name : 'Salesman';
      
      const title = status === 'accepted' 
        ? `✅ Assignment #${assignedNumber} Accepted` 
        : `❌ Assignment #${assignedNumber} Rejected`;
      const message = status === 'accepted'
        ? `Salesman ${salesmanName} has accepted the assignment #${assignedNumber}`
        : `Salesman ${salesmanName} has rejected the assignment #${assignedNumber}`;
      
      db.query(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'admin', ?, ?, 'salesman_assignment', ?, NOW())`,
        [salesmanId, title, message, transferId || salesmanId],
        (notifErr) => {
          if (notifErr) {
            console.error('Error creating admin notification:', notifErr);
          } else {
            console.log(`✅ Admin notification sent for ${assignedNumber}`);
          }
        }
      );
    }
  );
};

// ==================== GET PENDING ASSIGNMENTS ====================
exports.getPendingAssignments = (req, res) => {
  const { salesman_id } = req.query;
  
  if (!salesman_id) {
    return res.status(400).json({ message: "Salesman ID is required" });
  }
  
  assignedSalesmanModel.getPendingAssignmentsBySalesman(salesman_id, (err, results) => {
    if (err) {
      console.error("Error fetching pending assignments:", err);
      return res.status(500).json({ message: "Error fetching pending assignments" });
    }
    res.json(results);
  });
};

// ==================== OTHER EXISTING METHODS ====================
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

  assignedSalesmanModel.updateItemWeight(item_id, weightData, (err, result) => {
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

  assignedSalesmanModel.getItemWeight(item_id, (err, results) => {
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
  const { assigned_id } = req.params;

  if (!assigned_id) {
    return res.status(400).json({ message: "Assignment ID is required" });
  }

  assignedSalesmanModel.getItemsWithWeightsByAssignment(assigned_id, (err, results) => {
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