const paymentModel = require("./../../models/paymentaccountname/paymentnumber");

const getLastPaymentNumber = (req, res) => {
    paymentModel.getLastPaymentNumber((err, result) => {
      if (err) {
        console.error("Error fetching last payment number:", err);
        return res.status(500).json({ error: "Failed to fetch last payment number" });
      }
  
      if (result.length > 0) {
        // Safely process payment numbers to find the next one
        const payNumbers = result
          .map(row => row.payment_no)
          .filter(payment => payment && payment.startsWith("PAY")) // Ensure payment is defined
          .map(payment => parseInt(payment.slice(3), 10)); // Extract numeric part
  
        const lastPaymentNumber = payNumbers.length > 0 ? Math.max(...payNumbers) : 0;
        const nextPaymentNumber = `PAY${String(lastPaymentNumber + 1).padStart(3, "0")}`;
  
        res.json({ lastPaymentNumber: nextPaymentNumber });
      } else {
        res.json({ lastPaymentNumber: "PAY001" }); // Start with PAY001
      }
    });
  };
  

module.exports = { getLastPaymentNumber };
