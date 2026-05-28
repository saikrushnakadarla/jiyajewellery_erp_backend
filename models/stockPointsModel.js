const db = require('../db');

const createStockPoint = (data, callback) => {
  const sql = `
    INSERT INTO stock_points (stock_point_name, location, warehouse_id, description, status, default_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [
    data.stock_point_name,
    data.location,
    data.warehouse_id,
    data.description || null,
    data.status || 'active',
    data.default_status || 'not_applied'
  ], callback);
};

const getAllStockPoints = (callback) => {
  const sql = `
    SELECT sp.*, w.warehouse_name 
    FROM stock_points sp
    LEFT JOIN warehouses w ON sp.warehouse_id = w.warehouse_id
    ORDER BY sp.created_at DESC
  `;
  db.query(sql, callback);
};

const getStockPointById = (id, callback) => {
  const sql = `
    SELECT sp.*, w.warehouse_name 
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
  const sql = `
    UPDATE stock_points 
    SET stock_point_name = ?, 
        location = ?, 
        warehouse_id = ?, 
        description = ?, 
        status = ?,
        default_status = ?
    WHERE stock_point_id = ?
  `;
  db.query(sql, [
    data.stock_point_name,
    data.location,
    data.warehouse_id,
    data.description || null,
    data.status || 'active',
    data.default_status || 'not_applied',
    id
  ], callback);
};

const deleteStockPointById = (id, callback) => {
  const sql = 'DELETE FROM stock_points WHERE stock_point_id = ?';
  db.query(sql, [id], callback);
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

// New functions for default status management
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

module.exports = { 
  createStockPoint, 
  getAllStockPoints, 
  getStockPointById,
  getStockPointsByWarehouse,
  updateStockPointById, 
  deleteStockPointById,
  checkDuplicateStockPoint,
  resetAllDefaultStatus,
  setDefaultStockPoint
};