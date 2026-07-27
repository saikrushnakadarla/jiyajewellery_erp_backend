const db = require("../db");

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

  transfer_data.forEach(item => {
    totalQuantity += parseFloat(item.qty) || 0;
    totalGrossWeight += parseFloat(item.gross_weight) || 0;
    totalNetWeight += parseFloat(item.net_weight) || 0;
    totalPackingWt += parseFloat(item.packing_wt) || 0;
  });

  // Calculate packet_gross_total = totalGrossWeight + totalPackingWt
  const calculatedItemGrossTotal = totalGrossWeight;
  const calculatedPacketGrossTotal = totalGrossWeight + totalPackingWt;

  // Use provided values or calculated ones
  const finalItemGrossTotal = item_gross_total || calculatedItemGrossTotal;
  const finalPacketGrossTotal = packet_gross_total || calculatedPacketGrossTotal;
  const finalTotalWeightWithBag = total_weight_with_bag || 0;

  // Insert main transfer record with new fields
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
      remarks,
      capture_image,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

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
    'completed',
    remarks || null,
    capture_image || null,
    created_by || null
  ];

  db.query(insertTransferSql, transferParams, (err, transferResult) => {
    if (err) {
      console.error("Error inserting transfer:", err);
      return callback(err);
    }

    const assignedId = transferResult.insertId;

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
        created_at
      ) VALUES ?
    `;

    // Build item values with proper type checking
    const itemValues = transfer_data.map((item, index) => {
      // Debug: log the item to see what's being passed
      console.log(`📦 Processing item ${index}:`, JSON.stringify(item, null, 2));
      
      // Handle image path - ensure it's a string or null
      let imagePath = null;
      
      // Check if item.image exists and is a string
      if (item.image !== undefined && item.image !== null) {
        if (typeof item.image === 'string') {
          imagePath = item.image;
          
          // If it's a full URL, extract the path
          if (imagePath.startsWith('http')) {
            try {
              const urlObj = new URL(imagePath);
              imagePath = urlObj.pathname;
            } catch (e) {
              // If URL parsing fails, keep as is
            }
          }
          
          // Ensure it starts with '/'
          if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
            imagePath = '/' + imagePath;
          }
        } else {
          // If it's not a string, set to null
          console.log(`⚠️ Item ${index} image is not a string:`, typeof item.image);
          imagePath = null;
        }
      }

      // Build the row values with proper type checking
      const row = [
        assignedId,
        item.product_id !== undefined && item.product_id !== null ? String(item.product_id) : null,
        item.PCode_BarCode !== undefined && item.PCode_BarCode !== null ? String(item.PCode_BarCode) : null,
        item.product_name !== undefined && item.product_name !== null ? String(item.product_name) : null,
        item.metal_type !== undefined && item.metal_type !== null ? String(item.metal_type) : null,
        item.purity !== undefined && item.purity !== null ? String(item.purity) : null,
        item.category !== undefined && item.category !== null ? String(item.category) : null,
        item.sub_category !== undefined && item.sub_category !== null ? String(item.sub_category) : null,
        item.design_name !== undefined && item.design_name !== null ? String(item.design_name) : null,
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
        imagePath,
        item.remarks !== undefined && item.remarks !== null ? String(item.remarks) : null,
        new Date()
      ];

      // Debug: log the row to see what's being inserted
      console.log(`📦 Row ${index} image value:`, imagePath);

      return row;
    });

    // Debug: log the entire itemValues array
    console.log(`📦 Total items to insert: ${itemValues.length}`);
    console.log(`📦 First item values:`, itemValues[0]);

    db.query(insertItemsSql, [itemValues], (itemsErr) => {
      if (itemsErr) {
        console.error("Error inserting transfer items:", itemsErr);
        return callback(itemsErr);
      }
      
      console.log(`✅ Assignment ${assigned_number} saved with ${itemValues.length} items.`);
      console.log(`📷 Capture image: ${capture_image || 'None'}`);
      console.log(`📦 Item Gross Total: ${finalItemGrossTotal}`);
      console.log(`📦 Packet Gross Total: ${finalPacketGrossTotal}`);
      console.log(`📦 Total Weight with Bag: ${finalTotalWeightWithBag}`);
      callback(null, { transfer_id: assignedId, transfer_number: assigned_number });
    });
  });
};

// FIXED: Only update user_id, NOT Stock_Point
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
    // IMPORTANT: Only update user_id and Status, NOT Stock_Point
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
      console.log(`Updated user_id to ${userId} for ${result.affectedRows} products (Stock_Point unchanged)`);
      callback(null, { updatedCount: result.affectedRows });
    });
  });
};

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
      ast.remarks,
      ast.capture_image,
      ast.created_by,
      ast.created_at,
      ast.updated_at,
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
      ast.remarks,
      ast.capture_image,
      ast.created_by,
      ast.created_at,
      ast.updated_at,
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
        transfer_details: mainResults[0],
        transfer_items: itemsResults
      };
      
      callback(null, result);
    });
  });
};

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