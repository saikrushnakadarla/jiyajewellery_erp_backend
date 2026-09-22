const express = require("express");
const router = express.Router();
const db = require("../db");

// Feeds SalesPayment.jsx dropdowns (Invoice / Category)
// Table: repair_details (confirmed)
router.get("/get/sales", async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        invoice_number,
        account_name,
        category,
        product_name,
        total_weight_av,
        transaction_status
      FROM repair_details
      WHERE transaction_status IN ('Sales', 'ConvertedInvoice', 'ConvertedRepairInvoice')
    `;
    const [rows] = await db.promise().query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching sales lookup list:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;