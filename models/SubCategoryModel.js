const db = require("../db");

const createSubcategory = (formData, callback) => {
  const { category_id, metal_type_id, metal_type, category, sub_category_name, pricing, prefix, purity, selling_purity, printing_purity } = formData;
  const sql = "INSERT INTO subcategory (category_id, metal_type_id, metal_type, category, sub_category_name, pricing, prefix, purity, selling_purity, printing_purity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  db.query(sql, [category_id, metal_type_id, metal_type, category, sub_category_name, pricing, prefix, purity, selling_purity, printing_purity], (err, result) => {
    if (err) {
      console.error("Error inserting subcategory:", err);
      return callback(err, null);
    }
    callback(null, result);
  });
};

const fetchSubcategories = (callback) => {
  const sql = "SELECT * FROM subcategory";
  db.query(sql, callback);
};

const updateSubcategory = (subcategory_id, formData, callback) => {
  const { category_id, metal_type_id, metal_type, category, sub_category_name, pricing, prefix, purity, selling_purity, printing_purity } = formData;
  const sql = "UPDATE subcategory SET category_id = ?, metal_type_id = ?, metal_type = ?, category = ?, sub_category_name = ?, pricing = ?, prefix = ?, purity = ?, selling_purity = ?, printing_purity = ? WHERE subcategory_id = ?";
  db.query(sql, [category_id, metal_type_id, metal_type, category, sub_category_name, pricing, prefix, purity, selling_purity, printing_purity, subcategory_id], callback);
};

const deleteSubcategory = (subcategory_id, callback) => {
  const sql = "DELETE FROM subcategory WHERE subcategory_id = ?";
  db.query(sql, [subcategory_id], callback);
};

const fetchSubcategoryById = (subcategory_id, callback) => {
  const sql = "SELECT * FROM subcategory WHERE subcategory_id = ?";
  db.query(sql, [subcategory_id], callback);
};

module.exports = {
  createSubcategory,
  fetchSubcategories,
  fetchSubcategoryById, // Add this
  updateSubcategory,
  deleteSubcategory,
};