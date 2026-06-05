const db = require("../db");

exports.insert = (
  transfer_data,
  from_salesman_id,
  to_stock_point_id,
  transfer_date,
  reference_number,
  remarks,
  created_by,
  from_user_id = null,
  to_user_id = null,
  callback
) => {
  if (typeof from_user_id === 'function') {
    callback = from_user_id;
    from_user_id = null;
    to_user_id = null;
  }
  if (typeof to_user_id === 'function' && callback) {
    callback = to_user_id;
    to_user_id = null;
  }

  if (!Array.isArray(transfer_data) || transfer_data.length === 0) {
    return callback(new Error("Invalid transfer_data array"));
  }

  const received_number = reference_number;
  const transfer_date_formatted = transfer_date || new Date().toISOString().split('T')[0];

  let totalItems = transfer_data.length;
  let totalQuantity = 0;
  let totalGrossWeight = 0;
  let totalNetWeight = 0;

  transfer_data.forEach(item => {
    totalQuantity += parseFloat(item.qty) || 0;
    totalGrossWeight += parseFloat(item.gross_weight) || 0;
    totalNetWeight += parseFloat(item.net_weight) || 0;
  });

  const insertTransferSql = `
    INSERT INTO received_salesman_transfers (
      received_number,
      from_salesman_id,
      to_stock_point_id,
      from_user_id,
      to_user_id,
      transfer_date,
      total_items,
      total_quantity,
      total_gross_weight,
      total_net_weight,
      status,
      remarks,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const transferParams = [
    received_number,
    from_salesman_id || null,
    to_stock_point_id || null,
    from_user_id || null,
    to_user_id || null,
    transfer_date_formatted,
    totalItems,
    totalQuantity,
    totalGrossWeight,
    totalNetWeight,
    'completed',
    remarks || null,
    created_by || null
  ];

  db.query(insertTransferSql, transferParams, (err, transferResult) => {
    if (err) {
      console.error("Error inserting received transfer:", err);
      return callback(err);
    }

    const receivedId = transferResult.insertId;

    const insertItemsSql = `
      INSERT INTO received_salesman_items (
        received_id,
        assigned_item_id,
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
        stone_weight,
        net_weight,
        rate,
        making_charges,
        stone_price,
        total_price,
        remarks,
        created_at
      ) VALUES ?
    `;

    const itemValues = transfer_data.map(item => [
      receivedId,
      item.item_id || null,
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
      parseFloat(item.stone_weight) || 0,
      parseFloat(item.net_weight) || 0,
      parseFloat(item.rate) || 0,
      parseFloat(item.making_charges) || 0,
      parseFloat(item.stone_price) || 0,
      parseFloat(item.total_price) || 0,
      item.remarks || null,
      new Date()
    ]);

    db.query(insertItemsSql, [itemValues], (itemsErr) => {
      if (itemsErr) {
        console.error("Error inserting received items:", itemsErr);
        return callback(itemsErr);
      }
      
      callback(null, { transfer_id: receivedId, transfer_number: received_number });
    });
  });
};

exports.getAll = (callback) => {
  const sql = `
    SELECT 
      rst.received_id,
      rst.received_number,
      rst.from_salesman_id,
      rst.to_stock_point_id,
      rst.from_user_id,
      rst.to_user_id,
      rst.transfer_date,
      rst.total_items,
      rst.total_quantity,
      rst.total_gross_weight,
      rst.total_net_weight,
      rst.status,
      rst.remarks,
      rst.created_by,
      rst.created_at,
      rst.updated_at,
      ad.account_name as from_salesman_name,
      ad.mobile as salesman_mobile,
      sp.stock_point_name as to_stock_point_name
    FROM received_salesman_transfers rst
    LEFT JOIN account_details ad ON rst.from_salesman_id = ad.account_id
    LEFT JOIN stock_points sp ON rst.to_stock_point_id = sp.stock_point_id
    ORDER BY rst.created_at DESC
  `;
  db.query(sql, callback);
};

exports.getById = (received_id, callback) => {
  const mainSql = `
    SELECT 
      rst.received_id,
      rst.received_number,
      rst.from_salesman_id,
      rst.to_stock_point_id,
      rst.from_user_id,
      rst.to_user_id,
      rst.transfer_date,
      rst.total_items,
      rst.total_quantity,
      rst.total_gross_weight,
      rst.total_net_weight,
      rst.status,
      rst.remarks,
      rst.created_by,
      rst.created_at,
      rst.updated_at,
      ad.account_name as from_salesman_name,
      ad.mobile as salesman_mobile,
      sp.stock_point_name as to_stock_point_name
    FROM received_salesman_transfers rst
    LEFT JOIN account_details ad ON rst.from_salesman_id = ad.account_id
    LEFT JOIN stock_points sp ON rst.to_stock_point_id = sp.stock_point_id
    WHERE rst.received_id = ?
  `;

  db.query(mainSql, [received_id], (err, mainResults) => {
    if (err) {
      console.error("Error fetching received details:", err);
      return callback(err);
    }
    
    if (mainResults.length === 0) {
      return callback(null, null);
    }

    const itemsSql = `
      SELECT * FROM received_salesman_items
      WHERE received_id = ?
      ORDER BY item_id ASC
    `;

    db.query(itemsSql, [received_id], (itemsErr, itemsResults) => {
      if (itemsErr) {
        console.error("Error fetching received items:", itemsErr);
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

exports.update = (received_id, status, remarks, callback) => {
  const sql = `
    UPDATE received_salesman_transfers 
    SET status = ?, remarks = ?, updated_at = NOW()
    WHERE received_id = ?
  `;
  db.query(sql, [status, remarks, received_id], callback);
};

exports.delete = (received_id, callback) => {
  const deleteItemsSql = `DELETE FROM received_salesman_items WHERE received_id = ?`;
  db.query(deleteItemsSql, [received_id], (err) => {
    if (err) return callback(err);
    
    const deleteTransferSql = `DELETE FROM received_salesman_transfers WHERE received_id = ?`;
    db.query(deleteTransferSql, [received_id], callback);
  });
};

exports.updateStatus = (received_id, status, callback) => {
  const sql = `
    UPDATE received_salesman_transfers 
    SET status = ?, updated_at = NOW()
    WHERE received_id = ?
  `;
  db.query(sql, [status, received_id], callback);
};

exports.getLastReceivedNumber = (callback) => {
  const sql = `
    SELECT received_number FROM received_salesman_transfers 
    ORDER BY received_id DESC 
    LIMIT 1
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching last received number:", err);
      return callback(err);
    }
    
    if (results.length === 0) {
      return callback(null, "RCN001");
    }
    
    const lastNumber = results[0].received_number;
    const match = lastNumber.match(/RCN(\d+)/);
    if (match) {
      const num = parseInt(match[1]) + 1;
      const newNumber = `RCN${String(num).padStart(3, '0')}`;
      callback(null, newNumber);
    } else {
      callback(null, "RCN001");
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

// Update stock point back to Available and reset user_id
exports.updateStockPointForReceived = (productCodes, stockPointId, callback) => {
  if (!productCodes || productCodes.length === 0) {
    return callback(null, { message: "No products to update" });
  }

  const getStockPointSql = `
    SELECT stock_point_name FROM stock_points 
    WHERE stock_point_id = ?
  `;

  db.query(getStockPointSql, [stockPointId], (err, stockPointResult) => {
    if (err) {
      console.error("Error fetching stock point:", err);
      return callback(err);
    }

    if (stockPointResult.length === 0) {
      return callback(new Error("Stock point not found"));
    }

    const stockPointName = stockPointResult[0].stock_point_name;

    const placeholders = productCodes.map(() => '?').join(',');
    const updateSql = `
      UPDATE opening_tags_entry 
      SET Stock_Point = ?, user_id = NULL, Status = 'Available' 
      WHERE PCode_BarCode IN (${placeholders})
    `;

    const params = [stockPointName, ...productCodes];

    db.query(updateSql, params, (updateErr, result) => {
      if (updateErr) {
        console.error("Error updating stock point for received:", updateErr);
        return callback(updateErr);
      }
      console.log(`Updated stock point to '${stockPointName}', Status to 'Available', and user_id to NULL for ${result.affectedRows} products`);
      callback(null, { updatedCount: result.affectedRows });
    });
  });
};

// Delete records from assigned_salesman_transfers and assigned_salesman_items
exports.deleteAssignedRecords = (assignedIds, callback) => {
  if (!assignedIds || assignedIds.length === 0) {
    return callback(null, { deletedCount: 0 });
  }

  // First delete from assigned_salesman_items
  const deleteItemsSql = `DELETE FROM assigned_salesman_items WHERE assigned_id IN (?)`;
  
  db.query(deleteItemsSql, [assignedIds], (itemsErr, itemsResult) => {
    if (itemsErr) {
      console.error("Error deleting assigned items:", itemsErr);
      return callback(itemsErr);
    }
    
    // Then delete from assigned_salesman_transfers
    const deleteTransferSql = `DELETE FROM assigned_salesman_transfers WHERE assigned_id IN (?)`;
    
    db.query(deleteTransferSql, [assignedIds], (transferErr, transferResult) => {
      if (transferErr) {
        console.error("Error deleting assigned transfers:", transferErr);
        return callback(transferErr);
      }
      
      console.log(`Deleted ${itemsResult.affectedRows} items and ${transferResult.affectedRows} transfers`);
      callback(null, { 
        deletedCount: itemsResult.affectedRows + transferResult.affectedRows,
        itemsDeleted: itemsResult.affectedRows,
        transfersDeleted: transferResult.affectedRows
      });
    });
  });
};

// Get products assigned to a salesman (from assigned_salesman tables)
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
      asi.stone_weight,
      asi.net_weight,
      asi.rate,
      asi.making_charges,
      asi.stone_price,
      asi.total_price,
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


exports.getLastReceivedNumber = (callback) => {
  const sql = `
    SELECT received_number FROM received_salesman_transfers 
    ORDER BY received_id DESC 
    LIMIT 1
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching last received number:", err);
      return callback(err);
    }
    
    // If no records exist, start with RCN001
    if (results.length === 0) {
      return callback(null, "RCN001");
    }
    
    const lastNumber = results[0].received_number;
    const match = lastNumber.match(/RCN(\d+)/);
    if (match) {
      const num = parseInt(match[1]) + 1;
      const newNumber = `RCN${String(num).padStart(3, '0')}`;
      callback(null, newNumber);
    } else {
      callback(null, "RCN001");
    }
  });
};