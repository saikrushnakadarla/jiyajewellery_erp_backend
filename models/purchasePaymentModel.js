const db = require("../db"); // Import database connection

// Function to insert a purchase payment into the database
const insertPurchasePayment = async (paymentData) => {
    const query = `
        INSERT INTO purchasePayments 
        (date, mode, cheque_number, payment_no, account_name, invoice, category, rate_cut, total_wt, paid_wt, bal_wt, total_amt, paid_amt, bal_amt, paid_by, remarks, rate_cut_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
        paymentData.date,
        paymentData.mode,
        paymentData.cheque_number,
        paymentData.payment_no,
        paymentData.account_name,
        paymentData.invoice,
        paymentData.category,
        paymentData.rate_cut ? parseFloat(paymentData.rate_cut) : 0,  // Convert or default to 0
        paymentData.total_wt ? parseFloat(paymentData.total_wt) : 0,
        paymentData.paid_wt ? parseFloat(paymentData.paid_wt) : 0,
        paymentData.bal_wt ? parseFloat(paymentData.bal_wt) : 0,
        paymentData.total_amt ? parseFloat(paymentData.total_amt) : 0,
        paymentData.paid_amt ? parseFloat(paymentData.paid_amt) : 0,
        paymentData.bal_amt ? parseFloat(paymentData.bal_amt) : 0,
        paymentData.paid_by,
        paymentData.remarks,
        paymentData.rate_cut_id
    ];

    const [result] = await db.promise().query(query, values);
    return result.insertId;
};


const updateRateCutsTable = async (rate_cut_id, paid_wt, paid_amt) => {
    try {
        // First, update paid_wt
        await db.promise().query(`
            UPDATE ratecuts 
            SET paid_wt = paid_wt + ? 
            WHERE rate_cut_id = ?
        `, [paid_wt, rate_cut_id]);

        // Then, update bal_wt
        await db.promise().query(`
            UPDATE ratecuts 
            SET bal_wt = rate_cut_wt - paid_wt 
            WHERE rate_cut_id = ?
        `, [rate_cut_id]);

        // First, update paid_amt ensuring NULL is treated as 0
        await db.promise().query(`
            UPDATE ratecuts 
            SET paid_amount = COALESCE(paid_amount, 0) + ? 
            WHERE rate_cut_id = ?
        `, [paid_amt, rate_cut_id]);

                // Then, update balance_amount correctly
                await db.promise().query(`
            UPDATE ratecuts 
            SET balance_amount = rate_cut_amt - paid_amount 
            WHERE rate_cut_id = ?
        `, [rate_cut_id]);


    } catch (error) {
        console.error("Error updating ratecuts table:", error);
        throw error;
    }
};

const fetchPurchasePayments = async () => {
    const query = `SELECT * FROM purchasePayments ORDER BY created_at DESC`;
    const [results] = await db.promise().query(query);
    return results;
};

module.exports = { insertPurchasePayment, updateRateCutsTable, fetchPurchasePayments };
