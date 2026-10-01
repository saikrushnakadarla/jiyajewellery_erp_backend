const db = require('../db');

const createStockPoint = (data, callback) => {
  const sql = `
    INSERT INTO stock_points (stock_point_name, location, warehouse_id, description, user_id, user_name, password, status, default_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    data.stock_point_name,
    data.location,
    data.warehouse_id,
    data.description || null,
    data.user_id || null,
    data.user_name || null,
    data.password || null,
    data.status || 'active',
    data.default_status || 'not_applied'
  ], callback);
};

// salesman_ids is returned as a comma separated string, e.g. "77,72" (or NULL)
const getAllStockPoints = (callback) => {
  const sql = `
    SELECT sp.*, w.warehouse_name,
      (SELECT GROUP_CONCAT(sps.account_id ORDER BY sps.id)
         FROM stock_point_salesmen sps
        WHERE sps.stock_point_id = sp.stock_point_id) AS salesman_ids
    FROM stock_points sp
    LEFT JOIN warehouses w ON sp.warehouse_id = w.warehouse_id
    ORDER BY sp.created_at DESC
  `;
  db.query(sql, callback);
};

const getStockPointById = (id, callback) => {
  const sql = `
    SELECT sp.*, w.warehouse_name,
      (SELECT GROUP_CONCAT(sps.account_id ORDER BY sps.id)
         FROM stock_point_salesmen sps
        WHERE sps.stock_point_id = sp.stock_point_id) AS salesman_ids
    FROM stock_points sp
    LEFT JOIN warehouses w ON sp.warehouse_id = w.warehouse_id
    WHERE sp.stock_point_id = ?
  `;
  db.query(sql, [id], callback);
};

const getStockPointsByWarehouse = (callback) => {
  const sql = `
    SELECT * FROM warehouses 
    WHERE status = 'active'
  `;
  db.query(sql, callback);
};

const updateStockPointById = (id, data, callback) => {
  // Build dynamic SQL for update
  let sql = `
    UPDATE stock_points 
    SET stock_point_name = ?, 
        location = ?, 
        warehouse_id = ?, 
        description = ?, 
        user_id = ?,
        user_name = ?,
        status = ?,
        default_status = ?
  `;

  const params = [
    data.stock_point_name,
    data.location,
    data.warehouse_id,
    data.description || null,
    data.user_id || null,
    data.user_name || null,
    data.status || 'active',
    data.default_status || 'not_applied'
  ];

  // Only update password if provided
  if (data.password) {
    sql += `, password = ?`;
    params.push(data.password);
  }

  sql += ` WHERE stock_point_id = ?`;
  params.push(id);

  db.query(sql, params, callback);
};

const deleteStockPointById = (id, callback) => {
  // Remove salesman links first (safe even if FK cascade is missing)
  db.query('DELETE FROM stock_point_salesmen WHERE stock_point_id = ?', [id], (err) => {
    if (err) return callback(err);
    const sql = 'DELETE FROM stock_points WHERE stock_point_id = ?';
    db.query(sql, [id], callback);
  });
};

const checkDuplicateStockPoint = (name, warehouseId, excludeId = null, callback) => {
  let sql = `
    SELECT COUNT(*) as count 
    FROM stock_points 
    WHERE stock_point_name = ? AND warehouse_id = ?
  `;
  const params = [name, warehouseId];

  if (excludeId) {
    sql += ' AND stock_point_id != ?';
    params.push(excludeId);
  }

  db.query(sql, params, callback);
};

const getNextUserId = (callback) => {
  const sql = `
    SELECT MAX(user_id) as max_user_id 
    FROM stock_points 
    WHERE user_id IS NOT NULL
  `;
  db.query(sql, callback);
};

const resetAllDefaultStatus = (callback) => {
  const sql = `
    UPDATE stock_points 
    SET default_status = 'not_applied' 
    WHERE default_status = 'applied'
  `;
  db.query(sql, callback);
};

const setDefaultStockPoint = (id, callback) => {
  const sql = `
    UPDATE stock_points 
    SET default_status = 'applied' 
    WHERE stock_point_id = ?
  `;
  db.query(sql, [id], callback);
};

/* ---------------- Salesman mapping ---------------- */

// Replace ALL salesmen of a stock point with the given list of account_ids
const setSalesmen = (stockPointId, salesmanIds, callback) => {
  db.query('DELETE FROM stock_point_salesmen WHERE stock_point_id = ?', [stockPointId], (err) => {
    if (err) return callback(err);

    const ids = [...new Set((Array.isArray(salesmanIds) ? salesmanIds : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0))];

    if (ids.length === 0) return callback(null);

    const rows = ids.map((accountId) => [stockPointId, accountId]);
    db.query(
      'INSERT INTO stock_point_salesmen (stock_point_id, account_id) VALUES ?',
      [rows],
      callback
    );
  });
};

const getSalesmenByStockPointId = (stockPointId, callback) => {
  db.query(
    'SELECT account_id FROM stock_point_salesmen WHERE stock_point_id = ? ORDER BY id',
    [stockPointId],
    callback
  );
};

module.exports = { 
  createStockPoint, 
  getAllStockPoints, 
  getStockPointById,
  getStockPointsByWarehouse,
  updateStockPointById, 
  deleteStockPointById,
  checkDuplicateStockPoint,
  getNextUserId,
  resetAllDefaultStatus,
  setDefaultStockPoint,
  setSalesmen,
  getSalesmenByStockPointId
};