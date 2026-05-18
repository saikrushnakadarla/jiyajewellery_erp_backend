const db = require("../db");

const getAllSalesRateCuts = async () => {
    const query = `SELECT * FROM sales_rate_cuts ORDER BY created_at DESC`;
    const [rows] = await db.promise().query(query);
    return rows;
};

const getSalesRateCutById = async (id) => {
    const query = `SELECT * FROM sales_rate_cuts WHERE sales_rate_cut_id = ?`;
    const [rows] = await db.promise().query(query, [id]);
    return rows[0];
};

const getSalesRateCutsByRepairId = async (repairId) => {
    const query = `SELECT * FROM sales_rate_cuts WHERE repair_id = ? ORDER BY created_at DESC`;
    const [rows] = await db.promise().query(query, [repairId]);
    return rows;
};

const insertSalesRateCut = async (formData) => {
    const paid_amount = formData.paid_amount ? parseFloat(formData.paid_amount) : 0;
    const balance_amount = formData.balance_amount ? parseFloat(formData.balance_amount) : 0;
    const rate_cut_wt = formData.rate_cut_wt ? parseFloat(formData.rate_cut_wt) : 0;
    const rate_cut = formData.rate_cut ? parseFloat(formData.rate_cut) : 0;
    const rate_cut_amt = formData.rate_cut_amt ? parseFloat(formData.rate_cut_amt) : 0;

    // Calculate paid_wt and bal_wt safely
    const paid_wt = (paid_amount && rate_cut) ? (paid_amount / rate_cut).toFixed(3) : 0;
    const bal_wt = (rate_cut_wt - paid_wt).toFixed(3);

    const query = `
        INSERT INTO sales_rate_cuts 
        (repair_id, invoice_number, account_name, mobile, total_amt, rate_cut_wt, rate_cut, 
         rate_cut_amt, paid_amount, balance_amount, paid_wt, bal_wt, transaction_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.promise().query(query, [
        formData.repair_id,
        formData.invoice_number,
        formData.account_name,
        formData.mobile,
        parseFloat(formData.total_amt) || 0,
        rate_cut_wt,
        rate_cut,
        rate_cut_amt,
        paid_amount,
        balance_amount,
        paid_wt,
        bal_wt,
        formData.transaction_type || "Sales"
    ]);

    return result.insertId;
};

const updateRepairDetailsWithRateCut = async (repairId, paid_amount, rate_cut_wt) => {
    // First, get current repair details
    const getRepairQuery = `SELECT * FROM repair_details WHERE id = ?`;
    const [repairRows] = await db.promise().query(getRepairQuery, [repairId]);
    
    if (repairRows.length === 0) return;
    
    const repair = repairRows[0];
    const currentRateCutPaid = parseFloat(repair.rate_cut_paid_amount) || 0;
    const currentRateCutWt = parseFloat(repair.rate_cut_wt) || 0;
    
    const newPaidAmount = currentRateCutPaid + parseFloat(paid_amount);
    const newRateCutWt = currentRateCutWt + parseFloat(rate_cut_wt);
    
    // Update repair_details with cumulative rate cut values
    const updateQuery = `
        UPDATE repair_details 
        SET rate_cut_paid_amount = ?,
            rate_cut_wt = ?
        WHERE id = ?`;
    
    await db.promise().query(updateQuery, [newPaidAmount, newRateCutWt, repairId]);
};

module.exports = { 
    getAllSalesRateCuts, 
    getSalesRateCutById, 
    getSalesRateCutsByRepairId,
    insertSalesRateCut,
    updateRepairDetailsWithRateCut
};