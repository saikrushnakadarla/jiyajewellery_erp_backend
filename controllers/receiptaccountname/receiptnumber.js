const receiptModel = require("./../../models/receiptaccountname/receiptnumber");

const getLastReceiptNumber = (req, res) => {
  receiptModel.getLastReceiptNumber((err, result) => {
    if (err) {
      console.error("Error fetching last receipt number:", err);
      return res.status(500).json({ error: "Failed to fetch last receipt number" });
    }

    let nextReceiptNumber = "RCP001"; // Default if no receipts are found
    if (result.length > 0) {
      const rcpNumbers = result
        .map(row => row.receipt_no)
        .filter(receipt => receipt && receipt.startsWith("RCP")) // Ensure valid format
        .map(receipt => parseInt(receipt.slice(3), 10)); // Extract numeric part

      const lastReceiptNumber = rcpNumbers.length > 0 ? Math.max(...rcpNumbers) : 0;
      nextReceiptNumber = `RCP${String(lastReceiptNumber + 1).padStart(3, "0")}`;
    }

    res.json({ lastReceiptNumber: nextReceiptNumber });
  });
};

module.exports = { getLastReceiptNumber };
