const { insertPurchasePayment, updateRateCutsTable, fetchPurchasePayments } = require("../models/purchasePaymentModel");

// Controller function to insert purchase payment
const addPurchasePayment = async (req, res) => {
    try {
        const {
            date,
            mode,
            cheque_number,
            payment_no,
            account_name,
            invoice,
            category,
            rate_cut,
            total_wt,
            paid_wt,
            bal_wt,
            total_amt,
            paid_amt,
            bal_amt,
            remarks,
            rate_cut_id
        } = req.body;

        // Validate required fields
        if (!date || !invoice || !category || !total_amt) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Insert payment data
        const paymentId = await insertPurchasePayment(req.body);

        // Update ratecuts table
        await updateRateCutsTable(rate_cut_id, paid_wt, paid_amt);

        res.status(201).json({ message: "Purchase payment added successfully", paymentId });

    } catch (error) {
        console.error("Error inserting purchase payment:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getPurchasePayments = async (req, res) => {
    try {
        const payments = await fetchPurchasePayments();
        res.status(200).json(payments);
    } catch (error) {
        console.error("Error fetching purchase payments:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { addPurchasePayment, getPurchasePayments };
