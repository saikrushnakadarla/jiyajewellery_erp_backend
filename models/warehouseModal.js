// warehouseModel.js
const db = require('../db');

const createWarehouse = (data, callback) => {
  const sql = `
    INSERT INTO warehouses (warehouse_name, location, status)
    VALUES (?, ?, ?)
  `;
  
  db.query(sql, [
    data.warehouse_name,
    data.location,
    data.status
  ], callback);
};

const getAllWarehouses = (callback) => {
  const sql = `
    SELECT * FROM warehouses 
    ORDER BY created_at DESC
  `;
  db.query(sql, callback);
};

module.exports = { createWarehouse, getAllWarehouses };