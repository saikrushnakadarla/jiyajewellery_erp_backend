const db = require('../db');

const addOpeningTag = (data, callback) => {
  // Check for existing PCode_BarCode with the same Prefix
  const checkSql = "SELECT PCode_BarCode FROM opening_tags_entry WHERE PCode_BarCode LIKE ? ORDER BY PCode_BarCode DESC LIMIT 1";
  const prefixPattern = data.Prefix + "%";

  db.query(checkSql, [prefixPattern], (checkErr, checkResult) => {
    if (checkErr) return callback(checkErr);

    let startNumber = 1;
    if (checkResult.length > 0) {
      const lastCode = checkResult[0].PCode_BarCode;
      const lastNumber = parseInt(lastCode.replace(data.Prefix, ""), 10);
      startNumber = lastNumber + 1;
    }

    const insertEntries = [];
    for (let i = 0; i < data.pcs; i++) {
      const newPCode_BarCode = `${data.Prefix}${String(startNumber + i).padStart(3, '0')}`;
      const newData = { ...data, PCode_BarCode: newPCode_BarCode, pcs: 1 }; // Set pcs to 1
      insertEntries.push(newData);
    }

    const sql =
      `INSERT INTO opening_tags_entry (
          tag_id, product_id,  account_name,
          invoice, Pricing, cut, color, clarity, subcategory_id, sub_category, design_master, Prefix, category, Purity, metal_type, 
          PCode_BarCode, Gross_Weight, Stones_Weight, deduct_st_Wt, Stones_Price, WastageWeight, HUID_No, Wastage_On, Wastage_Percentage,
          Weight_BW, MC_Per_Gram, Making_Charges_On, TotalWeight_AW, Making_Charges, rate, tax, tax_amt, total_price, Status, Source, Stock_Point, pieace_cost, product_Name,
          making_on, selling_price, dropdown, qr_status, stone_price_per_carat, pur_Gross_Weight, pur_Stones_Weight, pur_deduct_st_Wt,
          pur_stone_price_per_carat, pur_Stones_Price, pur_Weight_BW, pur_Making_Charges_On, pur_MC_Per_Gram, pur_Making_Charges, 
          pur_Wastage_On, pur_Wastage_Percentage, pur_WastageWeight, pur_TotalWeight_AW, tag_weight, size, pcs, image, tax_percent,
          mrp_price, total_pcs_cost, pur_rate_cut, pur_Purity, pur_purityPercentage, printing_purity
        ) VALUES ?`;

    const values = insertEntries.map(entry => [
      entry.tag_id, entry.product_id, entry.account_name,
      entry.invoice, entry.Pricing, entry.cut, entry.color, entry.clarity, entry.subcategory_id, entry.sub_category, entry.design_master, 
      entry.Prefix, entry.category, entry.Purity, entry.metal_type, entry.PCode_BarCode, entry.Gross_Weight, entry.Stones_Weight, 
      entry.deduct_st_Wt, entry.Stones_Price, entry.WastageWeight, entry.HUID_No, entry.Wastage_On, entry.Wastage_Percentage, 
      entry.Weight_BW, entry.MC_Per_Gram, entry.Making_Charges_On, entry.TotalWeight_AW, entry.Making_Charges, entry.rate, entry.tax, 
      entry.tax_amt,entry.total_price, entry.Status, 
      entry.Source, entry.Stock_Point, entry.pieace_cost, entry.product_Name, entry.making_on, entry.selling_price, entry.dropdown, 
      entry.qr_status, entry.stone_price_per_carat,entry.pur_Gross_Weight, entry.pur_Stones_Weight, entry.pur_deduct_st_Wt, 
      entry.pur_stone_price_per_carat, entry.pur_Stones_Price, entry.pur_Weight_BW, entry.pur_Making_Charges_On, entry.pur_MC_Per_Gram,
      entry.pur_Making_Charges, entry.pur_Wastage_On, entry.pur_Wastage_Percentage, entry.pur_WastageWeight, entry.pur_TotalWeight_AW, 
      entry.tag_weight, entry.size, entry.pcs, entry.image, entry.tax_percent, entry.mrp_price, entry.total_pcs_cost, entry.pur_rate_cut, 
      entry.pur_Purity, entry.pur_purityPercentage, entry.printing_purity
    ]);

    db.query(sql, [values], (err, result) => {
      if (err) return callback(err);

      // Update the updated_values_table after successful insertion
      const updateSql =
        `UPDATE updated_values_table
   SET bal_pcs = bal_pcs - ?, 
       bal_gross_weight = bal_gross_weight - ?
   WHERE product_id = ? AND tag_id = ?`;

      db.query(updateSql, [data.pcs, data.Gross_Weight, data.product_id, data.tag_id], (updateErr, updateResult) => {
        if (updateErr) return callback(updateErr);
        callback(null, { insertResult: result, updateResult });
      });

    });
  });
};

const getAllOpeningTags = (callback) => {
  const sql = `SELECT * FROM opening_tags_entry`;
  db.query(sql, callback);
};

const updateOpeningTag = (id, updatedData, callback) => {
  const sql = `UPDATE opening_tags_entry SET ? WHERE opentag_id = ?`;
  db.query(sql, [updatedData, id], callback);
};

// const deleteOpeningTag = (id, callback) => {
//   const sql = `DELETE FROM opening_tags_entry WHERE opentag_id = ?`;
//   db.query(sql, [id], callback);
// };

const Subcategory = {
  create: (category_id, sub_category_name, category, prefix, metal_type, purity, selling_purity,printing_purity, callback) => {
    const query = 'INSERT INTO subcategory (category_id, sub_category_name, category, prefix, metal_type, purity, selling_purity, printing_purity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [category_id, sub_category_name, category, prefix, metal_type, purity, selling_purity, printing_purity], callback);
  },

  getAll: (callback) => {
    const query = 'SELECT * FROM subcategory';
    db.query(query, callback);
  },

  getById: (subcategoryId, callback) => {
    const query = 'SELECT * FROM subcategory WHERE subcategory_id = ?';
    db.query(query, [subcategoryId], callback);
  }
};

const getLastPcode = (callback) => {
  const query = "SELECT rbarcode FROM product WHERE rbarcode LIKE '0%' ORDER BY subcategory_id DESC";
  db.query(query, callback);
};

const getLastPCodeBarCode = (prefix, callback) => {
  const sql = `
      SELECT PCode_BarCode 
      FROM opening_tags_entry 
      WHERE Prefix = ? 
      ORDER BY PCode_BarCode DESC 
      LIMIT 1
  `;
  db.query(sql, [prefix], callback);
};



module.exports = {
  addOpeningTag,
  getAllOpeningTags,
  updateOpeningTag,
  Subcategory,
  getLastPcode,
  getLastPCodeBarCode,
  // deleteOpeningTag
};
