const { executeUpdateQuery, getAllPurchases, getLastRbarcode ,getLastInvoiceNumber, executeDeleteAndUpdateQuery} = require('../models/purchasesModel');

const updateBalanceAfterReceipt = async (req, res) => {
  const { invoice, balance_after_receipt } = req.body;

  if (!invoice || balance_after_receipt === undefined) {
    return res.status(400).json({ message: 'Invoice and balance_after_receipt are required' });
  }

  const query = `
    UPDATE purchases
    SET balance_after_receipt = ?
    WHERE invoice = ?
  `;
  const values = [balance_after_receipt, invoice];

  try {
    await executeUpdateQuery(query, values);
    res.status(200).json({ message: 'Balance after receipt updated successfully' });
  } catch (error) {
    console.error('Error updating balance after receipt:', error);
    res.status(500).json({ message: 'Error updating balance after receipt', error });
  }
}

// const deletePurchaseData = async (req, res) => {
//   const { purchaseIds } = req.body; // Array of purchase IDs to delete

//   if (!Array.isArray(purchaseIds) || purchaseIds.length === 0) {
//     return res.status(400).json({ message: 'Invalid purchase IDs' });
//   }

//   const deleteQuery = `
//     DELETE FROM purchases
//     WHERE id IN (?)
//   `;

//   // Prepare the update query to adjust product quantities and weights
//   const updateQuery = `
//     UPDATE product p
//     JOIN (
//       SELECT product_id, 
//              SUM(pcs) AS total_pcs, 
//              SUM(gross_weight) AS total_gross_weight
//       FROM purchases
//       WHERE id IN (?)
//       GROUP BY product_id
//     ) AS sub ON p.product_id = sub.product_id
//     SET 
//       p.pur_qty = p.pur_qty - sub.total_pcs,
//       p.pur_weight = p.pur_weight - sub.total_gross_weight
//   `;

//   try {
//     // Execute update and delete within a transaction
//     await executeDeleteAndUpdateQuery(deleteQuery, [purchaseIds], updateQuery, [purchaseIds]);
//     res.status(200).json({ message: 'Purchases deleted and products updated successfully' });
//   } catch (error) {
//     console.error('Error deleting purchase data or updating products:', error);
//     res.status(500).json({ message: 'Error processing request', error });
//   }
// };

const getPurchases = (req, res) => {
    getAllPurchases((err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).json({ message: 'Error fetching data.', error: err });
        } else {
            res.status(200).json(results);
        }
    });
};

const getLastCode = (req, res) => {
 getLastRbarcode((err, result) => {
    if (err) {
      console.error("Error fetching last rbarcode:", err);
      return res.status(500).json({ error: "Failed to fetch last rbarcode" });
    }

    // Ensure result has data
    if (result && result.length > 0) {
      // Extract rbarcode values that start with "RB"
      const rbNumbers = result
        .map(row => row.rbarcode) // Extract rbarcode from each row
        .filter(product => product && product.startsWith("RB")) // Filter only valid RB numbers
        .map(product => parseInt(product.slice(2), 10)) // Extract the numeric part of rbarcode
        .filter(number => !isNaN(number)); // Ensure numeric parsing was successful

      if (rbNumbers.length > 0) {
        // Find the maximum rbarcode number and increment it
        const lastrbNumbers = Math.max(...rbNumbers);
        const nextrbNumbers = `RB${String(lastrbNumbers + 1).padStart(3, "0")}`;
        return res.json({ lastrbNumbers: nextrbNumbers });
      }
    }

    // Default if no valid RB numbers are found
    res.json({ lastrbNumbers: "RB001" });
  });
};

const getLastInvoice = (req, res) => {
  getLastInvoiceNumber((err, result) => {
    if (err) {
      console.error("Error fetching last invoice number:", err);
      return res.status(500).json({ error: "Failed to fetch last invoice number" });
    }

    if (result.length > 0) {
      // Process invoice numbers to find the next one
      const invNumbers = result
        .map(row => row.invoice)
        .filter(invoice => invoice.startsWith("PNV"))
        .map(invoice => parseInt(invoice.slice(3), 10)); // Extract numeric part

      const lastInvoiceNumber = Math.max(...invNumbers);
      const nextInvoiceNumber = `PNV${String(lastInvoiceNumber + 1).padStart(3, "0")}`;

      res.json({ lastInvoiceNumber: nextInvoiceNumber });
    } else {
      res.json({ lastInvoiceNumber: "PNV001" }); // Start with INV001
    }
  });
};

module.exports = {
  // postPurchase,
  updateBalanceAfterReceipt,
  // deletePurchaseData,
  getPurchases,
  getLastCode,
  getLastInvoice
};
