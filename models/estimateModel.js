const db = require("../db");

const insertOrUpdateEstimate = (data, callback) => {
  const checkSql = "SELECT COUNT(*) AS count FROM estimate WHERE estimate_number = ?";
  db.query(checkSql, [data.estimate_number], (err, results) => {
    if (err) return callback(err);

    // Function to sanitize number fields
    const sanitizeNumber = (value, defaultValue = 0) => {
      return value === "" || value === null ? defaultValue : value;
    };

    const sanitizeNumeric = (value) => {
      return value ? parseFloat(value.toString().replace(/[^\d.]/g, "")) || 0 : 0;
    };

    if (results[0].count > 0) {
      // If the estimate_number exists, update it
      const updateSql = `
        UPDATE estimate SET
          date = ?, pcode = ?, code = ?, product_id = ?, product_name = ?, metal_type = ?, design_name = ?,
          purity = ?, category = ?, sub_category = ?, gross_weight = ?, stone_weight = ?, stone_price = ?,
          weight_bw = ?, va_on = ?, va_percent = ?, wastage_weight = ?, total_weight_av = ?,
          mc_on = ?, mc_per_gram = ?, making_charges = ?, rate = ?, rate_amt = ?, tax_percent = ?,
          tax_amt = ?, total_price = ?, pricing = ?, pieace_cost = ?, disscount_percentage = ?,
          disscount = ?, hm_charges = ?, total_amount = ?, taxable_amount = ?, tax_amount = ?, net_amount = ?,
          original_total_price = ?, opentag_id = ?, qty = ?
        WHERE estimate_number = ?`;

      db.query(updateSql, [
        data.date, data.pcode, data.code, data.product_id, data.product_name, data.metal_type, data.design_name,
        data.purity, data.category, data.sub_category, sanitizeNumber(data.gross_weight, 0),
        sanitizeNumber(data.stone_weight, 0), sanitizeNumber(data.stone_price, 0),
        sanitizeNumber(data.weight_bw, 0), sanitizeNumber(data.va_on, 0), sanitizeNumber(data.va_percent, 0),
        sanitizeNumber(data.wastage_weight, 0), sanitizeNumber(data.total_weight_av, 0),
        sanitizeNumber(data.mc_on, 0), sanitizeNumber(data.mc_per_gram, 0), sanitizeNumber(data.making_charges, 0),
        sanitizeNumber(data.rate, 0), sanitizeNumber(data.rate_amt, 0), sanitizeNumeric(data.tax_percent, 0),
        sanitizeNumber(data.tax_amt, 0), sanitizeNumber(data.total_price, 0), sanitizeNumber(data.pricing, 0),
        sanitizeNumber(data.pieace_cost, 0), sanitizeNumber(data.disscount_percentage, 0),
        sanitizeNumber(data.disscount, 0), sanitizeNumber(data.hm_charges, 0), sanitizeNumber(data.total_amount, 0),
        sanitizeNumber(data.taxable_amount, 0), sanitizeNumber(data.tax_amount, 0), sanitizeNumber(data.net_amount, 0),
        sanitizeNumber(data.original_total_price, 0), sanitizeNumber(data.opentag_id, 0), data.qty, data.estimate_number
      ], callback);
    } else {
      // If not, insert new entry
      const insertSql = `INSERT INTO estimate (
        date, pcode, estimate_number, code, product_id, product_name, metal_type, design_name, purity, category, sub_category,
        gross_weight, stone_weight, stone_price, weight_bw, va_on, va_percent, wastage_weight, total_weight_av,
        mc_on, mc_per_gram, making_charges, rate, rate_amt, tax_percent, tax_amt, total_price, pricing,
        pieace_cost, disscount_percentage, disscount, hm_charges, total_amount, taxable_amount, tax_amount, net_amount,
        original_total_price, opentag_id, qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(insertSql, [
        data.date, data.pcode, data.estimate_number, data.code, data.product_id, data.product_name, data.metal_type, data.design_name,
        data.purity, data.category, data.sub_category, sanitizeNumber(data.gross_weight, 0),
        sanitizeNumber(data.stone_weight, 0), sanitizeNumber(data.stone_price, 0),
        sanitizeNumber(data.weight_bw, 0), sanitizeNumber(data.va_on, 0), sanitizeNumber(data.va_percent, 0),
        sanitizeNumber(data.wastage_weight, 0), sanitizeNumber(data.total_weight_av, 0),
        sanitizeNumber(data.mc_on, 0), sanitizeNumber(data.mc_per_gram, 0), sanitizeNumber(data.making_charges, 0),
        sanitizeNumber(data.rate, 0), sanitizeNumber(data.rate_amt, 0), sanitizeNumeric(data.tax_percent, 0),
        sanitizeNumber(data.tax_amt, 0), sanitizeNumber(data.total_price, 0), sanitizeNumber(data.pricing, 0),
        sanitizeNumber(data.pieace_cost, 0), sanitizeNumber(data.disscount_percentage, 0),
        sanitizeNumber(data.disscount, 0), sanitizeNumber(data.hm_charges, 0), sanitizeNumber(data.total_amount, 0),
        sanitizeNumber(data.taxable_amount, 0), sanitizeNumber(data.tax_amount, 0), sanitizeNumber(data.net_amount, 0),
        sanitizeNumber(data.original_total_price, 0), sanitizeNumber(data.opentag_id, 0), data.qty
      ], callback);
    }
  });
};




const getEstimates = (callback) => {
  const sql = "SELECT * FROM estimate";
  db.query(sql, callback);
};

const updateEstimate = (id, data, callback) => {
  const sql = `UPDATE estimate SET
      date = ?, pcode = ?, estimate_number = ?,code = ?, product_id = ?, product_name = ?,metal_type = ?,design_name = ?,purity = ?,category = ?,sub_category = ?, gross_weight = ?,
      stone_weight = ?, stone_price = ?, weight_bw = ?, va_on = ?, va_percent = ?,
      wastage_weight = ?, total_weight_av = ?, mc_on = ?, mc_per_gram = ?, making_charges = ?,
      rate = ?,rate_amt = ?, tax_percent = ?, tax_amt = ?, total_price = ?
    WHERE id = ?`;

  db.query(sql, [
    data.date, data.pcode, data.estimate_number, data.code, data.product_id, data.product_name, data.metal_type, data.design_name, data.purity, data.category,
    data.sub_category, data.gross_weight, data.stone_weight, data.stone_price, data.weight_bw, data.va_on, data.va_percent,
    data.wastage_weight, data.total_weight_av, data.mc_on, data.mc_per_gram, data.making_charges,
    data.rate, data.rate_amt, data.tax_percent, data.tax_amt, data.total_price, id
  ], callback);
};

const deleteEstimateByNumber = (estimateNumber, callback) => {
  const sql = "DELETE FROM estimate WHERE estimate_number = ?";
  db.query(sql, [estimateNumber], callback);
};


const getLastEstimateNumber = (callback) => {
  const query = "SELECT estimate_number FROM estimate WHERE estimate_number LIKE 'EST%' ORDER BY estimate_id DESC";
  db.query(query, callback);
};

const getAllUniqueEstimates = (callback) => {
  const sql = `
      SELECT * 
      FROM estimate e1
      WHERE e1.estimate_id = (
        SELECT MAX(e2.estimate_id) 
        FROM estimate e2
        WHERE e1.estimate_number = e2.estimate_number
      )
    `;
  db.query(sql, callback);
};

const getByEstimateNumber = (estimateNumber, callback) => {
  const sql = `
      SELECT 
        date, pcode, estimate_number, code, product_id, product_name, metal_type, 
        design_name, purity,category, sub_category, gross_weight, stone_weight, stone_price, weight_bw, 
        va_on, va_percent, wastage_weight, total_weight_av, mc_on, 
        mc_per_gram, making_charges, rate, rate_amt, tax_percent, tax_amt, total_price, pricing, pieace_cost, disscount_percentage, disscount, hm_charges,
      total_amount, taxable_amount, tax_amount, net_amount, original_total_price, opentag_id, qty
      FROM estimate
      WHERE estimate_number = ?
    `;
  db.query(sql, [estimateNumber], callback);
};

module.exports = {
  insertOrUpdateEstimate,
  getEstimates,
  updateEstimate,
  deleteEstimateByNumber,
  getLastEstimateNumber,
  getAllUniqueEstimates,
  getByEstimateNumber,
};
