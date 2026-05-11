const db = require("../db");

const getAllRateCuts = async () => {
    const query = `SELECT * FROM rateCuts`; // Fetch all columns
    const [rows] = await db.promise().query(query);
    return rows;
};

const getRateCutById = async (id) => {
    const query = `SELECT * FROM rateCuts WHERE rate_cut_id = ?`;
    const [rows] = await db.promise().query(query, [id]);
    return rows[0]; // Assuming only one row is returned
};

const insertRateCut = async (formData) => {
    // Ensure numerical values, replacing empty strings with 0
    const paid_amount = formData.paid_amount ? parseFloat(formData.paid_amount) : 0;
    const balance_amount = formData.balance_amount ? parseFloat(formData.balance_amount) : 0;
    const rate_cut_wt = formData.rate_cut_wt ? parseFloat(formData.rate_cut_wt) : 0;
    const rate_cut = formData.rate_cut ? parseFloat(formData.rate_cut) : 0;

    // Calculate paid_wt and bal_wt safely
    const paid_wt = paid_amount && rate_cut ? paid_amount / rate_cut : 0;
    const bal_wt = rate_cut_wt - paid_wt;

    const query = `
      INSERT INTO rateCuts 
      (purchase_id, invoice, category, total_pure_wt, rate_cut_wt, rate_cut, rate_cut_amt, paid_amount, balance_amount, paid_wt, bal_wt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.promise().query(query, [
        formData.purchase_id,
        formData.invoice,
        formData.category,
        parseFloat(formData.total_pure_wt) || 0,
        rate_cut_wt,
        rate_cut,
        parseFloat(formData.rate_cut_amt) || 0,
        paid_amount,
        balance_amount,
        paid_wt,
        bal_wt,
    ]);

    return result.insertId;
};



const updatePurchase = async (purchase_id, rate_cut_wt, total_pure_wt) => {
    const query = `
      UPDATE purchases 
      SET paid_wt = COALESCE(paid_wt, 0) + ?, 
          balWt_after_payment = COALESCE(?, 0) - COALESCE(?, 0)
      WHERE id = ?`;

    await db.promise().query(query, [rate_cut_wt, total_pure_wt, rate_cut_wt, purchase_id]);
};





module.exports = { getAllRateCuts, getRateCutById, insertRateCut, updatePurchase };
