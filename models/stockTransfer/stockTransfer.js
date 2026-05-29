const db = require("../../db");

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
  callback
) => {
  if (!Array.isArray(transfer_data) || transfer_data.length === 0) {
    return callback(new Error("Invalid transfer_data array"));
  }

  // Generate transfer number if not provided
  const generateTransferNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `STF${year}${month}${day}${random}`;
  };

  const transfer_number = reference_number || generateTransferNumber();
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
    transfer_number,
    from_warehouse_id,
    to_warehouse_id,
    from_stock_point_id || null,
    to_stock_point_id || null,
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

    const transferId = transferResult.insertId;

    // Insert transfer items
    const insertItemsSql = `
      INSERT INTO stock_transfer_items (
        transfer_id,
        product_id,
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
      transferId,
      item.product_id || null,
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
      
      callback(null, { transfer_id: transferId, transfer_number: transfer_number });
    });
  });
};

exports.getAll = (callback) => {
  const sql = `
    SELECT 
      st.*,
      w1.warehouse_name as from_warehouse_name,
      w2.warehouse_name as to_warehouse_name,
      sp1.stock_point_name as from_stock_point_name,
      sp2.stock_point_name as to_stock_point_name
    FROM stock_transfers st
    LEFT JOIN warehouses w1 ON st.from_warehouse_id = w1.warehouse_id
    LEFT JOIN warehouses w2 ON st.to_warehouse_id = w2.warehouse_id
    LEFT JOIN stock_points sp1 ON st.from_stock_point_id = sp1.stock_point_id
    LEFT JOIN stock_points sp2 ON st.to_stock_point_id = sp2.stock_point_id
    ORDER BY st.created_at DESC
  `;
  db.query(sql, callback);
};

exports.getById = (transfer_id, callback) => {
  const mainSql = `
    SELECT 
      st.*,
      w1.warehouse_name as from_warehouse_name,
      w2.warehouse_name as to_warehouse_name,
      sp1.stock_point_name as from_stock_point_name,
      sp2.stock_point_name as to_stock_point_name
    FROM stock_transfers st
    LEFT JOIN warehouses w1 ON st.from_warehouse_id = w1.warehouse_id
    LEFT JOIN warehouses w2 ON st.to_warehouse_id = w2.warehouse_id
    LEFT JOIN stock_points sp1 ON st.from_stock_point_id = sp1.stock_point_id
    LEFT JOIN stock_points sp2 ON st.to_stock_point_id = sp2.stock_point_id
    WHERE st.transfer_id = ?
  `;

  db.query(mainSql, [transfer_id], (err, mainResults) => {
    if (err) {
      console.error("Error fetching transfer details:", err);
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

exports.update = (transfer_id, status, remarks, callback) => {
  const sql = `
    UPDATE stock_transfers 
    SET status = ?, remarks = ?, updated_at = NOW()
    WHERE transfer_id = ?
  `;
  db.query(sql, [status, remarks, transfer_id], callback);
};

exports.delete = (transfer_id, callback) => {
  // First delete items, then delete main record
  const deleteItemsSql = `DELETE FROM stock_transfer_items WHERE transfer_id = ?`;
  db.query(deleteItemsSql, [transfer_id], (err) => {
    if (err) return callback(err);
    
    const deleteTransferSql = `DELETE FROM stock_transfers WHERE transfer_id = ?`;
    db.query(deleteTransferSql, [transfer_id], callback);
  });
};

exports.updateStatus = (transfer_id, status, callback) => {
  const sql = `
    UPDATE stock_transfers 
    SET status = ?, updated_at = NOW()
    WHERE transfer_id = ?
  `;
  db.query(sql, [status, transfer_id], callback);
};

exports.getByDateRange = (start_date, end_date, callback) => {
  const sql = `
    SELECT 
      st.*,
      w1.warehouse_name as from_warehouse_name,
      w2.warehouse_name as to_warehouse_name,
      sp1.stock_point_name as from_stock_point_name,
      sp2.stock_point_name as to_stock_point_name
    FROM stock_transfers st
    LEFT JOIN warehouses w1 ON st.from_warehouse_id = w1.warehouse_id
    LEFT JOIN warehouses w2 ON st.to_warehouse_id = w2.warehouse_id
    LEFT JOIN stock_points sp1 ON st.from_stock_point_id = sp1.stock_point_id
    LEFT JOIN stock_points sp2 ON st.to_stock_point_id = sp2.stock_point_id
    WHERE st.transfer_date BETWEEN ? AND ?
    ORDER BY st.transfer_date DESC
  `;
  db.query(sql, [start_date, end_date], callback);
};

exports.getByStatus = (status, callback) => {
  const sql = `
    SELECT 
      st.*,
      w1.warehouse_name as from_warehouse_name,
      w2.warehouse_name as to_warehouse_name,
      sp1.stock_point_name as from_stock_point_name,
      sp2.stock_point_name as to_stock_point_name
    FROM stock_transfers st
    LEFT JOIN warehouses w1 ON st.from_warehouse_id = w1.warehouse_id
    LEFT JOIN warehouses w2 ON st.to_warehouse_id = w2.warehouse_id
    LEFT JOIN stock_points sp1 ON st.from_stock_point_id = sp1.stock_point_id
    LEFT JOIN stock_points sp2 ON st.to_stock_point_id = sp2.stock_point_id
    WHERE st.status = ?
    ORDER BY st.created_at DESC
  `;
  db.query(sql, [status], callback);
};

exports.getLastTransferNumber = (callback) => {
  const sql = `
    SELECT transfer_number FROM stock_transfers 
    ORDER BY transfer_id DESC 
    LIMIT 1
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching last transfer number:", err);
      return callback(err);
    }
    
    if (results.length === 0) {
      return callback(null, "STF001");
    }
    
    const lastNumber = results[0].transfer_number;
    // Extract numeric part and increment
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