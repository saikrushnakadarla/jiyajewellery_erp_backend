// models/designMasterModel.js
const db = require('../db');

const createDesignMaster = (data, callback) => {
  const sql = `
    INSERT INTO designmaster (metal, short_id, item_type, design_item, design_name, wastage_percentage, making_charge, design_short_code, brand_category, mc_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Convert empty strings to NULL for numeric fields
  const formatValue = (value) => (value === "" ? null : value);

  db.query(sql, [
    data.metal,
    data.short_id,
    data.item_type,
    data.design_item,
    data.design_name,
    formatValue(data.wastage_percentage),
    formatValue(data.making_charge),  // Fix applied here
    data.design_short_code,
    data.brand_category,
    data.mc_type
  ], callback);
};


const getAllDesignMasters = (callback) => {
  const sql = 'SELECT * FROM designmaster';
  db.query(sql, callback);
};

const getDesignMasterById = (id, callback) => {
  const sql = 'SELECT * FROM designmaster WHERE design_id = ?';
  db.query(sql, [id], callback);
};

const updateDesignMaster = (id, data, callback) => {
  const sql = `
    UPDATE designmaster
    SET metal = ?, short_id = ?, item_type = ?, design_item = ?, design_name = ?, wastage_percentage = ?, making_charge = ?, design_short_code = ?, brand_category = ?, mc_type = ?
    WHERE design_id = ?
  `;
  db.query(sql, [
    data.metal,
    data.short_id,
    data.item_type,
    data.design_item,
    data.design_name,
    data.wastage_percentage,
    data.making_charge,
    data.design_short_code,
    data.brand_category,
    data.mc_type,
    id
  ], callback);
};

const deleteDesignMaster = (id, callback) => {
  const sql = 'DELETE FROM designmaster WHERE design_id = ?';
  db.query(sql, [id], callback);
};

module.exports = {
  createDesignMaster,
  getAllDesignMasters,
  getDesignMasterById,
  updateDesignMaster,
  deleteDesignMaster
};
