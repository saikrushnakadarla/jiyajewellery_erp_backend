const {
  insertSalesPayment,
  updateSalesRateCutsTable,
  fetchSalesPayments,
  getLastSalesPaymentNumber,
} = require("../models/salesPaymentModel");

const addSalesPayment = async (req, res) => {
  try {
    const { date, invoice, category, total_amt, paid_wt, paid_amt, rate_cut_id } = req.body;

    if (!date || !invoice || !category || !total_amt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paymentId = await insertSalesPayment(req.body);
    await updateSalesRateCutsTable(rate_cut_id, paid_wt, paid_amt);

    res.status(201).json({ message: "Sales payment added successfully", paymentId });
  } catch (error) {
    console.error("Error inserting sales payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getSalesPayments = async (req, res) => {
  try {
    const payments = await fetchSalesPayments();
    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching sales payments:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const lastSalesPaymentNumber = async (req, res) => {
  try {
    const lastPaymentNumber = await getLastSalesPaymentNumber();
    res.status(200).json({ lastPaymentNumber });
  } catch (error) {
    console.error("Error getting last sales payment number:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { addSalesPayment, getSalesPayments, lastSalesPaymentNumber };