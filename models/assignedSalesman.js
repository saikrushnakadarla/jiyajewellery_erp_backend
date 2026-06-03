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

  const assigned_number = reference_number;
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
      status,
      remarks,
      created_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
    'completed',
    remarks || null,
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
      assignedId,
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
        console.error("Error inserting transfer items:", itemsErr);
        return callback(itemsErr);
      }
      
      callback(null, { transfer_id: assignedId, transfer_number: assigned_number });
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
      ast.status,
      ast.remarks,
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
      ast.status,
      ast.remarks,
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

exports.updateStockPointForSalesman = (productCodes, salesmanId, callback) => {
  if (!productCodes || productCodes.length === 0) {
    return callback(null, { message: "No products to update" });
  }

  const getSalesmanSql = `
    SELECT account_name, user_id FROM account_details 
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

    const salesmanName = salesmanResult[0].account_name;
    const userId = salesmanResult[0].user_id;

    const placeholders = productCodes.map(() => '?').join(',');
    const updateSql = `
      UPDATE opening_tags_entry 
      SET Stock_Point = ?, user_id = ?, Status = 'Assigned' 
      WHERE PCode_BarCode IN (${placeholders})
    `;

    const params = [salesmanName, userId, ...productCodes];

    db.query(updateSql, params, (updateErr, result) => {
      if (updateErr) {
        console.error("Error updating stock point for salesman:", updateErr);
        return callback(updateErr);
      }
      console.log(`Updated stock point to '${salesmanName}' and user_id to ${userId} for ${result.affectedRows} products`);
      callback(null, { updatedCount: result.affectedRows });
    });
  });
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
      ast.status,
      ast.remarks,
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
      ast.status,
      ast.remarks,
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