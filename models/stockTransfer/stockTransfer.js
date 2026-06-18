const db = require("../../db");

/**
 * Insert a new stock transfer with its items.
 * The 'image' field in each item should already be a file path (not base64).
 */
exports.insert = (
  transfer_data,
  from_warehouse_id,
  to_warehouse_id,
  from_stock_point_id,
  to_stock_point_id,
  transfer_date,
  reference_number,
  remarks,
  created_by,
  from_user_id = null,
  to_user_id = null,
  callback
) => {
  // Handle optional parameters (if called with fewer args)
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

  const transfer_number = reference_number;
  const transfer_date_formatted = transfer_date || new Date().toISOString().split('T')[0];

  // Calculate totals
  let totalItems = transfer_data.length;
  let totalQuantity = 0;
  let totalGrossWeight = 0;
  let totalNetWeight = 0;

  transfer_data.forEach(item => {
    totalQuantity += parseFloat(item.qty) || 0;
    totalGrossWeight += parseFloat(item.gross_weight) || 0;
    totalNetWeight += parseFloat(item.net_weight) || 0;
  });

  // Insert main transfer record
  const insertTransferSql = `
    INSERT INTO stock_transfers (
      transfer_number,
      from_warehouse_id,
      to_warehouse_id,
      from_stock_point_id,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const transferParams = [
    transfer_number,
    from_warehouse_id,
    to_warehouse_id,
    from_stock_point_id || null,
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
      console.error("❌ Error inserting transfer:", err);
      return callback(err);
    }

    const transferId = transferResult.insertId;

    // Insert transfer items – image is now a file path (not base64)
    const insertItemsSql = `
      INSERT INTO stock_transfer_items (
        transfer_id,
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
        image,
        created_at
      ) VALUES ?
    `;

    const itemValues = transfer_data.map(item => [
      transferId,
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
      item.image || null,      // ✅ file path, not base64
      new Date()
    ]);

    db.query(insertItemsSql, [itemValues], (itemsErr) => {
      if (itemsErr) {
        console.error("❌ Error inserting transfer items:", itemsErr);
        return callback(itemsErr);
      }

      console.log(`✅ Transfer ${transfer_number} saved with ${itemValues.length} items.`);
      callback(null, { transfer_id: transferId, transfer_number: transfer_number });
    });
  });
};

/**
 * Get all stock transfers with warehouse and stock point names.
 */
exports.getAll = (callback) => {
  const sql = `
    SELECT 
      st.*,
      w1.warehouse_name as from_warehouse_name,
      w2.warehouse_name as to_warehouse_name,
      sp1.stock_point_name as from_stock_point_name,
      sp2.stock_point_name as to_stock_point_name,
      sp1.user_id as from_user_id_value,
      sp2.user_id as to_user_id_value
    FROM stock_transfers st
    LEFT JOIN warehouses w1 ON st.from_warehouse_id = w1.warehouse_id
    LEFT JOIN warehouses w2 ON st.to_warehouse_id = w2.warehouse_id
    LEFT JOIN stock_points sp1 ON st.from_stock_point_id = sp1.stock_point_id
    LEFT JOIN stock_points sp2 ON st.to_stock_point_id = sp2.stock_point_id
    ORDER BY st.created_at DESC
  `;
  db.query(sql, callback);
};

/**
 * Get a single stock transfer by ID, including its items.
 */
exports.getById = (transfer_id, callback) => {
  const mainSql = `
    SELECT 
      st.*,
      w1.warehouse_name as from_warehouse_name,
      w2.warehouse_name as to_warehouse_name,
      sp1.stock_point_name as from_stock_point_name,
      sp2.stock_point_name as to_stock_point_name,
      sp1.user_id as from_user_id_value,
      sp2.user_id as to_user_id_value
    FROM stock_transfers st
    LEFT JOIN warehouses w1 ON st.from_warehouse_id = w1.warehouse_id
    LEFT JOIN warehouses w2 ON st.to_warehouse_id = w2.warehouse_id
    LEFT JOIN stock_points sp1 ON st.from_stock_point_id = sp1.stock_point_id
    LEFT JOIN stock_points sp2 ON st.to_stock_point_id = sp2.stock_point_id
    WHERE st.transfer_id = ?
  `;

  db.query(mainSql, [transfer_id], (err, mainResults) => {
    if (err) {
      console.error("❌ Error fetching transfer details:", err);
      return callback(err);
    }

    if (mainResults.length === 0) {
      return callback(null, null);
    }

    const itemsSql = `
      SELECT * FROM stock_transfer_items
      WHERE transfer_id = ?
      ORDER BY item_id ASC
    `;

    db.query(itemsSql, [transfer_id], (itemsErr, itemsResults) => {
      if (itemsErr) {
        console.error("❌ Error fetching transfer items:", itemsErr);
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

/**
 * Update status and remarks of a transfer.
 */
exports.update = (transfer_id, status, remarks, callback) => {
  const sql = `
    UPDATE stock_transfers 
    SET status = ?, remarks = ?, updated_at = NOW()
    WHERE transfer_id = ?
  `;
  db.query(sql, [status, remarks, transfer_id], callback);
};

/**
 * Delete a transfer and its items.
 */
exports.delete = (transfer_id, callback) => {
  // Delete items first
  const deleteItemsSql = `DELETE FROM stock_transfer_items WHERE transfer_id = ?`;
  db.query(deleteItemsSql, [transfer_id], (err) => {
    if (err) return callback(err);

    // Delete main record
    const deleteTransferSql = `DELETE FROM stock_transfers WHERE transfer_id = ?`;
    db.query(deleteTransferSql, [transfer_id], callback);
  });
};

/**
 * Update stock point and user_id for transferred products in opening_tags_entry.
 */
exports.updateStockPointForTransfer = (productCodes, toStockPointId, callback) => {
  if (!productCodes || productCodes.length === 0) {
    return callback(null, { message: "No products to update" });
  }

  // Get stock point name and user_id
  const getStockPointSql = `
    SELECT stock_point_name, user_id FROM stock_points 
    WHERE stock_point_id = ?
  `;

  db.query(getStockPointSql, [toStockPointId], (err, stockPointResult) => {
    if (err) {
      console.error("❌ Error fetching stock point:", err);
      return callback(err);
    }

    if (stockPointResult.length === 0) {
      return callback(new Error("Stock point not found"));
    }

    const stockPointName = stockPointResult[0].stock_point_name;
    const userId = stockPointResult[0].user_id;

    // Update opening_tags_entry
    const placeholders = productCodes.map(() => '?').join(',');
    const updateSql = `
      UPDATE opening_tags_entry 
      SET Stock_Point = ?, user_id = ? 
      WHERE PCode_BarCode IN (${placeholders})
    `;

    const params = [stockPointName, userId, ...productCodes];

    db.query(updateSql, params, (updateErr, result) => {
      if (updateErr) {
        console.error("❌ Error updating stock point and user_id:", updateErr);
        return callback(updateErr);
      }
      console.log(`✅ Updated stock point to '${stockPointName}' and user_id to ${userId} for ${result.affectedRows} products`);
      callback(null, { updatedCount: result.affectedRows });
    });
  });
};

/**
 * Get the last transfer number to increment for the next one.
 */
exports.getLastTransferNumber = (callback) => {
  const sql = `
    SELECT transfer_number FROM stock_transfers 
    ORDER BY transfer_id DESC 
    LIMIT 1
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error fetching last transfer number:", err);
      return callback(err);
    }

    if (results.length === 0) {
      return callback(null, "STF001");
    }

    const lastNumber = results[0].transfer_number;
    const match = lastNumber.match(/STF(\d+)/);
    if (match) {
      const num = parseInt(match[1]) + 1;
      const newNumber = `STF${String(num).padStart(3, '0')}`;
      callback(null, newNumber);
    } else {
      callback(null, "STF001");
    }
  });
};

exports.updateStockPointForTransfer = (productCodes, toStockPointId, callback) => {
  if (!productCodes || productCodes.length === 0) {
    return callback(null, { message: "No products to update" });
  }

  const getStockPointSql = `
    SELECT stock_point_name, user_id FROM stock_points 
    WHERE stock_point_id = ?
  `;

  db.query(getStockPointSql, [toStockPointId], (err, stockPointResult) => {
    if (err) {
      console.error("Error fetching stock point:", err);
      return callback(err);
    }

    if (stockPointResult.length === 0) {
      return callback(new Error("Stock point not found"));
    }

    const stockPointName = stockPointResult[0].stock_point_name;
    const userId = stockPointResult[0].user_id;

    const placeholders = productCodes.map(() => '?').join(',');
    const updateSql = `
      UPDATE opening_tags_entry 
      SET Stock_Point = ?, user_id = ? 
      WHERE PCode_BarCode IN (${placeholders})
    `;

    const params = [stockPointName, userId, ...productCodes];

    db.query(updateSql, params, (updateErr, result) => {
      if (updateErr) {
        console.error("Error updating stock point and user_id:", updateErr);
        return callback(updateErr);
      }
      console.log(`Updated stock point to '${stockPointName}' and user_id to ${userId} for ${result.affectedRows} products`);
      callback(null, { updatedCount: result.affectedRows });
    });
  });
};