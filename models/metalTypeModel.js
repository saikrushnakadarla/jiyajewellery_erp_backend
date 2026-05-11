// models/metalTypeModel.js
const db = require('../db');

const createMetalType = (data, callback) => {
  const sql = `
    INSERT INTO metaltype (
      metal_name, 
      hsn_code, 
      description, 
      default_purity, 
      default_purity_for_rate_entry, 
      default_purity_for_old_metal, 
      default_issue_purity
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  // Convert empty strings to NULL for decimal fields
  const formatValue = (value) => (value === "" ? null : value);

  db.query(
    sql,
    [
      data.metal_name,
      data.hsn_code,
      data.description,
      formatValue(data.default_purity),
      formatValue(data.default_purity_for_rate_entry),
      formatValue(data.default_purity_for_old_metal),
      formatValue(data.default_issue_purity)
    ],
    callback
  );
};


// Get all MetalTypes
const getAllMetalTypes = (callback) => {
  const sql = 'SELECT * FROM metaltype';
  db.query(sql, callback);
};

// Get metaltype by ID
const getMetalTypeById = (id, callback) => {
  const sql = 'SELECT * FROM metaltype WHERE metal_type_id = ?';
  db.query(sql, [id], callback);
};

const updateMetalType = (id, data, callback) => {
  const sql = `
    UPDATE metaltype
    SET 
      metal_name = ?, 
      hsn_code = ?, 
      description = ?, 
      default_purity = ?, 
      default_purity_for_rate_entry = ?, 
      default_purity_for_old_metal = ?, 
      default_issue_purity = ?
    WHERE metal_type_id = ?  -- Ensure ID is used to update the correct record
  `;

  const formatValue = (value) => (value === "" ? null : value);

  db.query(
    sql,
    [
      data.metal_name,
      data.hsn_code,
      data.description,
      formatValue(data.default_purity),
      formatValue(data.default_purity_for_rate_entry),
      formatValue(data.default_purity_for_old_metal),
      formatValue(data.default_issue_purity),
      id  // Ensure ID is passed to match the correct row
    ],
    callback
  );
};


// Delete metaltype by ID
const deleteMetalType = (id, callback) => {
  const sql = 'DELETE FROM metaltype WHERE metal_type_id = ?';
  db.query(sql, [id], callback);
};

module.exports = {
  createMetalType,
  getAllMetalTypes,
  getMetalTypeById,
  updateMetalType,
  deleteMetalType
};
