const db = require('../db');

const createPurity = (data, callback) => {
  const sql = `
    INSERT INTO purity (name, metal, purity_percentage, purity, urd_purity, \`desc\`, old_purity_desc, cut_issue, skin_print)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Ensure `purity_percentage` is a valid decimal value
  const purityPercentage = data.purity_percentage && !isNaN(data.purity_percentage) 
    ? parseFloat(data.purity_percentage) 
    : null; // Set to NULL if empty or invalid

  db.query(sql, [
    data.name,
    data.metal,
    purityPercentage, // Use the parsed value
    data.purity || null, // Ensure all empty fields are NULL
    data.urd_purity || null,
    data.desc || null,
    data.old_purity_desc || null,
    data.cut_issue || null,
    data.skin_print || null
  ], callback);
};


const getAllPurities = (callback) => {
  const sql = 'SELECT * FROM purity ';
  db.query(sql, callback);
};

const getPurityById = (id, callback) => {
  const sql = 'SELECT * FROM purity  WHERE purity_id = ?';
  db.query(sql, [id], callback);
};

const updatePurityById = (id, data, callback) => {
  const sql = `
    UPDATE purity 
    SET name = ?, metal = ?, purity_percentage = ?, purity = ?, urd_purity = ?, \`desc\` = ?, old_purity_desc = ?, cut_issue = ?, skin_print = ?
    WHERE purity_id = ?
  `;
  db.query(sql, [data.name, data.metal, data.purity_percentage, data.purity, data.urd_purity, data.desc, data.old_purity_desc, data.cut_issue, data.skin_print, id], callback);
};

const deletePurityById = (id, callback) => {
  const sql = 'DELETE FROM purity  WHERE purity_id = ?';
  db.query(sql, [id], callback);
};

module.exports = { createPurity, getAllPurities, getPurityById, updatePurityById, deletePurityById };
