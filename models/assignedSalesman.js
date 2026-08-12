const db = require("../db");

// ==================== INSERT (Now saves as PENDING) ====================
// ==================== INSERT (Now saves as PENDING) ====================
exports.insert = (
  transfer_data,
  from_stock_point_id,
  to_salesman_id,
  transfer_date,
  reference_number,
  remarks,
  created_by,
  from_user_id = null,
  to_user_id = null,
  capture_image = null,
  item_gross_total = 0,
  packet_gross_total = 0,
  total_weight_with_bag = 0,
  callback
) => {
  // Handle optional parameters
  if (typeof from_user_id === 'function') {
    callback = from_user_id;
    from_user_id = null;
    to_user_id = null;
    capture_image = null;
    item_gross_total = 0;
    packet_gross_total = 0;
    total_weight_with_bag = 0;
  }
  if (typeof to_user_id === 'function' && callback) {
    callback = to_user_id;
    to_user_id = null;
    capture_image = null;
    item_gross_total = 0;
    packet_gross_total = 0;
    total_weight_with_bag = 0;
  }
  if (typeof capture_image === 'function' && callback) {
    callback = capture_image;
    capture_image = null;
    item_gross_total = 0;
    packet_gross_total = 0;
    total_weight_with_bag = 0;
  }

  if (!Array.isArray(transfer_data) || transfer_data.length === 0) {
    return callback(new Error("Invalid transfer_data array"));
  }

  const assigned_number = reference_number;
  const transfer_date_formatted = transfer_date || new Date().toISOString().split('T')[0];

  let totalItems = transfer_data.length;
  let totalQuantity = 0;
  let totalGrossWeight = 0;
  let totalNetWeight = 0;
  let totalPackingWt = 0;
  let totalWeightMachineReading = 0;
  let totalWeightMachineGrams = 0;
  let totalWeightMachineMilligrams = 0;
  let totalWeightMachineConfidence = 0;

  transfer_data.forEach(item => {
    totalQuantity += parseFloat(item.qty) || 0;
    totalGrossWeight += parseFloat(item.gross_weight) || 0;
    totalNetWeight += parseFloat(item.net_weight) || 0;
    totalPackingWt += parseFloat(item.packing_wt) || 0;
    totalWeightMachineReading += parseFloat(item.weight_machine_reading) || 0;
    totalWeightMachineGrams += parseInt(item.weight_machine_grams) || 0;
    totalWeightMachineMilligrams += parseInt(item.weight_machine_milligrams) || 0;
    totalWeightMachineConfidence += parseInt(item.weight_machine_confidence) || 0;
  });

  // Calculate averages for confidence
  const avgWeightMachineConfidence = totalItems > 0 
    ? Math.round(totalWeightMachineConfidence / totalItems) 
    : 0;

  const calculatedItemGrossTotal = totalGrossWeight;
  const calculatedPacketGrossTotal = totalGrossWeight + totalPackingWt;

  const finalItemGrossTotal = item_gross_total || calculatedItemGrossTotal;
  const finalPacketGrossTotal = packet_gross_total || calculatedPacketGrossTotal;
  const finalTotalWeightWithBag = total_weight_with_bag || 0;

  // Store ALL data as JSON in pending_data field
  const pendingData = JSON.stringify({
    transfer_data: transfer_data.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      metal_type: item.metal_type,
      purity: item.purity,
      category: item.category,
      sub_category: item.sub_category,
      design_name: item.design_name,
      qty: parseFloat(item.qty) || 1,
      gross_weight: parseFloat(item.gross_weight) || 0,
      cover_wt: parseFloat(item.cover_wt) || 0,
      card_wt: parseFloat(item.card_wt) || 0,
      packing_wt: parseFloat(item.packing_wt) || 0,
      stone_weight: parseFloat(item.stone_weight) || 0,
      net_weight: parseFloat(item.net_weight) || 0,
      rate: parseFloat(item.rate) || 0,
      making_charges: parseFloat(item.making_charges) || 0,
      stone_price: parseFloat(item.stone_price) || 0,
      total_price: parseFloat(item.total_price) || 0,
      PCode_BarCode: item.PCode_BarCode,
      image: item.image || null,
      remarks: item.remarks || null,
      // Weight machine data - stored in pending data
      weight_machine_reading: parseFloat(item.weight_machine_reading) || 0,
      weight_machine_grams: parseInt(item.weight_machine_grams) || 0,
      weight_machine_milligrams: parseInt(item.weight_machine_milligrams) || 0,
      weight_machine_confidence: parseInt(item.weight_machine_confidence) || 0,
      weight_machine_raw: item.weight_machine_raw || null,
    })),
    from_stock_point_id: from_stock_point_id,
    to_salesman_id: to_salesman_id,
    transfer_date: transfer_date_formatted,
    remarks: remarks,
    created_by: created_by,
    from_user_id: from_user_id,
    to_user_id: to_user_id,
    capture_image: capture_image,
    item_gross_total: finalItemGrossTotal,
    packet_gross_total: finalPacketGrossTotal,
    total_weight_with_bag: finalTotalWeightWithBag,
    total_items: totalItems,
    total_quantity: totalQuantity,
    total_gross_weight: totalGrossWeight,
    total_net_weight: totalNetWeight
  });

  // Insert the header record with pending_data and weight fields
  const insertTransferSql = `
    INSERT INTO assigned_salesman_transfers (
      assigned_number,
      from_stock_point_id,
      to_salesman_id,
      from_user_id,
      to_user_id,
      transfer_date,
      total_items,
      total_quantity,
      total_gross_weight,
      total_net_weight,
      item_gross_total,
      packet_gross_total,
      total_weight_with_bag,
      status,
      salesman_status,
      remarks,
      capture_image,
      created_by,
      pending_data,
      weight_machine_reading,
      weight_machine_grams,
      weight_machine_milligrams,
      weight_machine_confidence,
      weight_machine_raw,
      weight_extracted_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
  `;

  // Get the latest weight_extracted_at from items (if any have weights)
  let latestWeightExtractedAt = null;
  for (const item of transfer_data) {
    if (item.weight_machine_reading && parseFloat(item.weight_machine_reading) > 0) {
      latestWeightExtractedAt = new Date();
      break;
    }
  }

  const transferParams = [
    assigned_number,
    from_stock_point_id || null,
    to_salesman_id || null,
    from_user_id || null,
    to_user_id || null,
    transfer_date_formatted,
    totalItems,
    totalQuantity,
    totalGrossWeight,
    totalNetWeight,
    finalItemGrossTotal,
    finalPacketGrossTotal,
    finalTotalWeightWithBag,
    'pending',
    'pending',
    remarks || null,
    capture_image || null,
    created_by || null,
    pendingData,
    // Weight fields
    totalWeightMachineReading || 0,
    totalWeightMachineGrams || 0,
    totalWeightMachineMilligrams || 0,
    avgWeightMachineConfidence || 0,
    null, // weight_machine_raw (we don't have a single raw value for the whole transfer)
    latestWeightExtractedAt
  ];

  db.query(insertTransferSql, transferParams, (err, transferResult) => {
    if (err) {
      console.error("Error inserting transfer:", err);
      return callback(err);
    }

    const assignedId = transferResult.insertId;
    
    console.log(`✅ Assignment ${assigned_number} saved as PENDING (ID: ${assignedId})`);
    console.log(`📦 ${totalItems} items pending approval`);
    console.log(`📊 Total weight machine reading: ${totalWeightMachineReading}g`);
    
    callback(null, { transfer_id: assignedId, transfer_number: assigned_number });
  });
};

// ==================== APPROVE / ACCEPT ====================
// ==================== APPROVE / ACCEPT ====================
exports.approveAssignment = (assigned_id, callback) => {
  // First get the pending data
  const getSql = `SELECT pending_data FROM assigned_salesman_transfers WHERE assigned_id = ?`;
  
  db.query(getSql, [assigned_id], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(new Error("Assignment not found"));
    
    const pendingData = results[0].pending_data;
    if (!pendingData) return callback(new Error("No pending data found"));
    
    try {
      const data = JSON.parse(pendingData);
      const transferData = data.transfer_data || [];
      
      if (transferData.length === 0) {
        return callback(new Error("No items to transfer"));
      }
      
      // Insert items into assigned_salesman_items
      const insertItemsSql = `
        INSERT INTO assigned_salesman_items (
          assigned_id,
          product_id,
          PCode_BarCode,
          product_name,
          metal_type,
          purity,
          category,
          sub_category,
          design_name,
          qty,
          gross_weight,
          cover_wt,
          card_wt,
          packing_wt,
          stone_weight,
          net_weight,
          rate,
          making_charges,
          stone_price,
          total_price,
          image,
          remarks,
          weight_machine_reading,
          weight_machine_grams,
          weight_machine_milligrams,
          weight_machine_confidence,
          weight_machine_raw,
          weight_extracted_at,
          created_at
        ) VALUES ?
      `;

      const itemValues = transferData.map(item => [
        assigned_id,
        item.product_id || null,
        item.PCode_BarCode || null,
        item.product_name || null,
        item.metal_type || null,
        item.purity || null,
        item.category || null,
        item.sub_category || null,
        item.design_name || null,
        parseFloat(item.qty) || 0,
        parseFloat(item.gross_weight) || 0,
        parseFloat(item.cover_wt) || 0,
        parseFloat(item.card_wt) || 0,
        parseFloat(item.packing_wt) || 0,
        parseFloat(item.stone_weight) || 0,
        parseFloat(item.net_weight) || 0,
        parseFloat(item.rate) || 0,
        parseFloat(item.making_charges) || 0,
        parseFloat(item.stone_price) || 0,
        parseFloat(item.total_price) || 0,
        item.image || null,
        item.remarks || null,
        parseFloat(item.weight_machine_reading) || 0,
        parseInt(item.weight_machine_grams) || 0,
        parseInt(item.weight_machine_milligrams) || 0,
        parseInt(item.weight_machine_confidence) || 0,
        item.weight_machine_raw || null,
        item.weight_machine_reading ? new Date() : null,
        new Date()
      ]);
      
      db.query(insertItemsSql, [itemValues], (itemsErr) => {
        if (itemsErr) {
          console.error("Error inserting transfer items:", itemsErr);
          return callback(itemsErr);
        }
        
        // Update status to 'accepted' and clear pending_data
        const updateSql = `
          UPDATE assigned_salesman_transfers 
          SET salesman_status = 'accepted', 
              status = 'completed',
              pending_data = NULL,
              updated_at = NOW()
          WHERE assigned_id = ?
        `;
        
        db.query(updateSql, [assigned_id], (updateErr) => {
          if (updateErr) {
            console.error("Error updating status:", updateErr);
            return callback(updateErr);
          }
          
          console.log(`✅ Assignment ${assigned_id} approved with ${itemValues.length} items`);
          callback(null, { approved: true, itemCount: itemValues.length });
        });
      });
      
    } catch (parseError) {
      console.error("Error parsing pending data:", parseError);
      callback(parseError);
    }
  });
};

// ==================== REJECT ====================
exports.rejectAssignment = (assigned_id, callback) => {
  const sql = `
    UPDATE assigned_salesman_transfers 
    SET salesman_status = 'rejected', 
        status = 'cancelled',
        pending_data = NULL,
        updated_at = NOW()
    WHERE assigned_id = ?
  `;
  
  db.query(sql, [assigned_id], (err, result) => {
    if (err) return callback(err);
    console.log(`❌ Assignment ${assigned_id} rejected`);
    callback(null, { rejected: true });
  });
};

// ==================== GET PENDING ASSIGNMENTS ====================
// ==================== GET PENDING ASSIGNMENTS ====================
exports.getPendingAssignmentsBySalesman = (salesman_id, callback) => {
  const sql = `
    SELECT 
      ast.assigned_id,
      ast.assigned_number,
      ast.from_stock_point_id,
      ast.to_salesman_id,
      ast.from_user_id,
      ast.to_user_id,
      ast.transfer_date,
      ast.total_items,
      ast.total_quantity,
      ast.total_gross_weight,
      ast.total_net_weight,
      ast.item_gross_total,
      ast.packet_gross_total,
      ast.total_weight_with_bag,
      ast.status,
      ast.salesman_status,
      ast.remarks,
      ast.capture_image,
      ast.created_by,
      ast.pending_data,
      ast.created_at,
      ast.updated_at,
      ast.weight_machine_reading,
      ast.weight_machine_grams,
      ast.weight_machine_milligrams,
      ast.weight_machine_confidence,
      ast.weight_machine_raw,
      ast.weight_extracted_at,
      sp.stock_point_name as from_stock_point_name,
      ad.account_name as to_salesman_name,
      ad.mobile as salesman_mobile
    FROM assigned_salesman_transfers ast
    LEFT JOIN stock_points sp ON ast.from_stock_point_id = sp.stock_point_id
    LEFT JOIN account_details ad ON ast.to_salesman_id = ad.account_id
    WHERE ast.to_salesman_id = ? AND ast.salesman_status = 'pending'
    ORDER BY ast.created_at DESC
  `;
  db.query(sql, [salesman_id], callback);
};

// ==================== GET BY ID (with items from pending_data if not approved) ====================
// ==================== GET BY ID (with items from pending_data if not approved) ====================
exports.getById = (assigned_id, callback) => {
  const mainSql = `
    SELECT 
      ast.assigned_id,
      ast.assigned_number,
      ast.from_stock_point_id,
      ast.to_salesman_id,
      ast.from_user_id,
      ast.to_user_id,
      ast.transfer_date,
      ast.total_items,
      ast.total_quantity,
      ast.total_gross_weight,
      ast.total_net_weight,
      ast.item_gross_total,
      ast.packet_gross_total,
      ast.total_weight_with_bag,
      ast.status,
      ast.salesman_status,
      ast.remarks,
      ast.capture_image,
      ast.created_by,
      ast.pending_data,
      ast.created_at,
      ast.updated_at,
      ast.weight_machine_reading,
      ast.weight_machine_grams,
      ast.weight_machine_milligrams,
      ast.weight_machine_confidence,
      ast.weight_machine_raw,
      ast.weight_extracted_at,
      sp.stock_point_name as from_stock_point_name,
      ad.account_name as to_salesman_name,
      ad.mobile as salesman_mobile
    FROM assigned_salesman_transfers ast
    LEFT JOIN stock_points sp ON ast.from_stock_point_id = sp.stock_point_id
    LEFT JOIN account_details ad ON ast.to_salesman_id = ad.account_id
    WHERE ast.assigned_id = ?
  `;

  db.query(mainSql, [assigned_id], (err, mainResults) => {
    if (err) {
      console.error("Error fetching transfer details:", err);
      return callback(err);
    }
    
    if (mainResults.length === 0) {
      return callback(null, null);
    }

    const transferDetails = mainResults[0];
    
    // If pending, parse items from pending_data
    if (transferDetails.salesman_status === 'pending' && transferDetails.pending_data) {
      try {
        const pendingData = JSON.parse(transferDetails.pending_data);
        const items = pendingData.transfer_data || [];
        
        const result = {
          transfer_details: transferDetails,
          transfer_items: items
        };
        return callback(null, result);
      } catch (parseError) {
        console.error("Error parsing pending_data:", parseError);
        // Fallback to querying items table
      }
    }
    
    // If approved or no pending_data, get items from items table
    const itemsSql = `
      SELECT * FROM assigned_salesman_items
      WHERE assigned_id = ?
      ORDER BY item_id ASC
    `;

    db.query(itemsSql, [assigned_id], (itemsErr, itemsResults) => {
      if (itemsErr) {
        console.error("Error fetching transfer items:", itemsErr);
        return callback(itemsErr);
      }
      
      const result = {
        transfer_details: transferDetails,
        transfer_items: itemsResults || []
      };
      
      callback(null, result);
    });
  });
};

// ==================== GET ALL ====================
// ==================== GET ALL ====================
exports.getAll = (callback) => {
  const sql = `
    SELECT 
      ast.assigned_id,
      ast.assigned_number,
      ast.from_stock_point_id,
      ast.to_salesman_id,
      ast.from_user_id,
      ast.to_user_id,
      ast.transfer_date,
      ast.total_items,
      ast.total_quantity,
      ast.total_gross_weight,
      ast.total_net_weight,
      ast.item_gross_total,
      ast.packet_gross_total,
      ast.total_weight_with_bag,
      ast.status,
      ast.salesman_status,
      ast.remarks,
      ast.capture_image,
      ast.created_by,
      ast.created_at,
      ast.updated_at,
      ast.weight_machine_reading,
      ast.weight_machine_grams,
      ast.weight_machine_milligrams,
      ast.weight_machine_confidence,
      ast.weight_machine_raw,
      ast.weight_extracted_at,
      sp.stock_point_name as from_stock_point_name,
      ad.account_name as to_salesman_name,
      ad.mobile as salesman_mobile
    FROM assigned_salesman_transfers ast
    LEFT JOIN stock_points sp ON ast.from_stock_point_id = sp.stock_point_id
    LEFT JOIN account_details ad ON ast.to_salesman_id = ad.account_id
    ORDER BY ast.created_at DESC
  `;
  db.query(sql, callback);
};

// ==================== UPDATE STOCK POINT FOR SALESMAN ====================
exports.updateStockPointForSalesman = (productCodes, salesmanId, callback) => {
  if (!productCodes || productCodes.length === 0) {
    return callback(null, { message: "No products to update" });
  }

  const getSalesmanSql = `
    SELECT account_name, account_id FROM account_details 
    WHERE account_id = ?
  `;

  db.query(getSalesmanSql, [salesmanId], (err, salesmanResult) => {
    if (err) {
      console.error("Error fetching salesman:", err);
      return callback(err);
    }

    if (salesmanResult.length === 0) {
      return callback(new Error("Salesman not found"));
    }

    const userId = salesmanResult[0].account_id;

    const placeholders = productCodes.map(() => '?').join(',');
    const updateSql = `
      UPDATE opening_tags_entry 
      SET user_id = ?, Status = 'Assigned' 
      WHERE PCode_BarCode IN (${placeholders})
    `;

    const params = [userId, ...productCodes];

    db.query(updateSql, params, (updateErr, result) => {
      if (updateErr) {
        console.error("Error updating user_id for salesman:", updateErr);
        return callback(updateErr);
      }
      console.log(`Updated user_id to ${userId} for ${result.affectedRows} products`);
      callback(null, { updatedCount: result.affectedRows });
    });
  });
};

// ==================== UPDATE SALESMAN STATUS ====================
exports.updateSalesmanStatus = (assigned_id, status, callback) => {
  if (status === 'accepted') {
    // Call approve function
    exports.approveAssignment(assigned_id, callback);
  } else if (status === 'rejected') {
    exports.rejectAssignment(assigned_id, callback);
  } else {
    callback(new Error("Invalid status. Must be 'accepted' or 'rejected'"));
  }
};

// ==================== OTHER EXISTING METHODS ====================
// Keep all other existing methods (update, delete, getLastAssignedNumber, etc.)

exports.update = (assigned_id, status, remarks, callback) => {
  const sql = `
    UPDATE assigned_salesman_transfers 
    SET status = ?, remarks = ?, updated_at = NOW()
    WHERE assigned_id = ?
  `;
  db.query(sql, [status, remarks, assigned_id], callback);
};

exports.delete = (assigned_id, callback) => {
  const deleteItemsSql = `DELETE FROM assigned_salesman_items WHERE assigned_id = ?`;
  db.query(deleteItemsSql, [assigned_id], (err) => {
    if (err) return callback(err);
    
    const deleteTransferSql = `DELETE FROM assigned_salesman_transfers WHERE assigned_id = ?`;
    db.query(deleteTransferSql, [assigned_id], callback);
  });
};

exports.updateStatus = (assigned_id, status, callback) => {
  const sql = `
    UPDATE assigned_salesman_transfers 
    SET status = ?, updated_at = NOW()
    WHERE assigned_id = ?
  `;
  db.query(sql, [status, assigned_id], callback);
};

exports.getLastAssignedNumber = (callback) => {
  const sql = `
    SELECT assigned_number FROM assigned_salesman_transfers 
    ORDER BY assigned_id DESC 
    LIMIT 1
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching last assigned number:", err);
      return callback(err);
    }
    
    if (results.length === 0) {
      return callback(null, "ASN001");
    }
    
    const lastNumber = results[0].assigned_number;
    const match = lastNumber.match(/ASN(\d+)/);
    if (match) {
      const num = parseInt(match[1]) + 1;
      const newNumber = `ASN${String(num).padStart(3, '0')}`;
      callback(null, newNumber);
    } else {
      callback(null, "ASN001");
    }
  });
};

exports.getSalesmen = (callback) => {
  const sql = `
    SELECT account_id, account_name, mobile, email 
    FROM account_details 
    WHERE account_group = 'SALESMAN'
    ORDER BY account_name
  `;
  db.query(sql, callback);
};

exports.getByDateRange = (start_date, end_date, callback) => {
  const sql = `
    SELECT 
      ast.assigned_id,
      ast.assigned_number,
      ast.from_stock_point_id,
      ast.to_salesman_id,
      ast.from_user_id,
      ast.to_user_id,
      ast.transfer_date,
      ast.total_items,
      ast.total_quantity,
      ast.total_gross_weight,
      ast.total_net_weight,
      ast.item_gross_total,
      ast.packet_gross_total,
      ast.total_weight_with_bag,
      ast.status,
      ast.salesman_status,
      ast.remarks,
      ast.capture_image,
      ast.created_by,
      ast.created_at,
      ast.updated_at,
      sp.stock_point_name as from_stock_point_name,
      ad.account_name as to_salesman_name
    FROM assigned_salesman_transfers ast
    LEFT JOIN stock_points sp ON ast.from_stock_point_id = sp.stock_point_id
    LEFT JOIN account_details ad ON ast.to_salesman_id = ad.account_id
    WHERE ast.transfer_date BETWEEN ? AND ?
    ORDER BY ast.transfer_date DESC
  `;
  db.query(sql, [start_date, end_date], callback);
};

exports.getByStatus = (status, callback) => {
  const sql = `
    SELECT 
      ast.assigned_id,
      ast.assigned_number,
      ast.from_stock_point_id,
      ast.to_salesman_id,
      ast.from_user_id,
      ast.to_user_id,
      ast.transfer_date,
      ast.total_items,
      ast.total_quantity,
      ast.total_gross_weight,
      ast.total_net_weight,
      ast.item_gross_total,
      ast.packet_gross_total,
      ast.total_weight_with_bag,
      ast.status,
      ast.salesman_status,
      ast.remarks,
      ast.capture_image,
      ast.created_by,
      ast.created_at,
      ast.updated_at,
      sp.stock_point_name as from_stock_point_name,
      ad.account_name as to_salesman_name
    FROM assigned_salesman_transfers ast
    LEFT JOIN stock_points sp ON ast.from_stock_point_id = sp.stock_point_id
    LEFT JOIN account_details ad ON ast.to_salesman_id = ad.account_id
    WHERE ast.status = ?
    ORDER BY ast.created_at DESC
  `;
  db.query(sql, [status], callback);
};

exports.getProductsBySalesman = (salesman_id, callback) => {
  const sql = `
    SELECT 
      asi.item_id,
      asi.assigned_id,
      asi.product_id,
      asi.PCode_BarCode,
      asi.product_name,
      asi.metal_type,
      asi.purity,
      asi.category,
      asi.sub_category,
      asi.design_name,
      asi.qty,
      asi.gross_weight,
      asi.cover_wt,
      asi.card_wt,
      asi.packing_wt,
      asi.stone_weight,
      asi.net_weight,
      asi.rate,
      asi.making_charges,
      asi.stone_price,
      asi.total_price,
      asi.image,
      ast.transfer_date,
      ast.status as transfer_status
    FROM assigned_salesman_items asi
    INNER JOIN assigned_salesman_transfers ast ON asi.assigned_id = ast.assigned_id
    WHERE ast.to_salesman_id = ? 
      AND ast.status = 'completed'
    ORDER BY ast.transfer_date DESC, asi.item_id ASC
  `;
  
  db.query(sql, [salesman_id], (err, results) => {
    if (err) {
      console.error("Error fetching products by salesman:", err);
      return callback(err);
    }
    callback(null, results);
  });
};


// ==================== UPDATE WEIGHT FOR ITEM ====================
// ==================== UPDATE WEIGHT FOR ITEM ====================
exports.updateItemWeight = (item_id, weightData, callback) => {
  const { 
    total_grams, 
    grams, 
    milligrams, 
    raw_text, 
    confidence 
  } = weightData;

  const sql = `
    UPDATE assigned_salesman_items 
    SET 
      weight_machine_reading = ?,
      weight_machine_grams = ?,
      weight_machine_milligrams = ?,
      weight_machine_confidence = ?,
      weight_machine_raw = ?,
      weight_extracted_at = NOW()
    WHERE item_id = ?
  `;

  const params = [
    total_grams || 0,
    grams || 0,
    milligrams || 0,
    confidence || 100,
    raw_text || null,
    item_id
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating item weight:", err);
      return callback(err);
    }
    callback(null, { success: true, affectedRows: result.affectedRows });
  });
};

// ==================== GET ITEM WEIGHT ====================
exports.getItemWeight = (item_id, callback) => {
  const sql = `
    SELECT 
      item_id,
      weight_machine_reading,
      weight_machine_grams,
      weight_machine_milligrams,
      weight_machine_confidence,
      weight_machine_raw,
      weight_extracted_at
    FROM assigned_salesman_items 
    WHERE item_id = ?
  `;
  db.query(sql, [item_id], callback);
};

// ==================== GET ALL ITEMS WITH WEIGHT FOR ASSIGNMENT ====================
exports.getItemsWithWeightsByAssignment = (assigned_id, callback) => {
  const sql = `
    SELECT 
      item_id,
      product_id,
      PCode_BarCode,
      product_name,
      gross_weight,
      weight_machine_reading,
      weight_machine_grams,
      weight_machine_milligrams,
      weight_machine_confidence,
      weight_machine_raw,
      weight_extracted_at
    FROM assigned_salesman_items 
    WHERE assigned_id = ?
    ORDER BY item_id ASC
  `;
  db.query(sql, [assigned_id], callback);
};