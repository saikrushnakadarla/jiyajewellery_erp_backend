const invoiceModel = require("./../../models/sales/invoicenumber");
const db = require("../../db");

const getLastInvoiceNumber = (req, res) => {
  invoiceModel.getLastInvoiceNumber((err, result) => {
    if (err) {
      console.error("Error fetching last invoice number:", err);
      return res.status(500).json({ error: "Failed to fetch last invoice number" });
    }

    if (result.length > 0) {
      // Process invoice numbers to find the next one
      const invNumbers = result
        .map(row => row.invoice_number)
        .filter(invoice => invoice.startsWith("INV"))
        .map(invoice => parseInt(invoice.slice(3), 10)); // Extract numeric part

      const lastInvoiceNumber = Math.max(...invNumbers);
      const nextInvoiceNumber = `INV${String(lastInvoiceNumber + 1).padStart(3, "0")}`;

      res.json({ lastInvoiceNumber: nextInvoiceNumber });
    } else {
      res.json({ lastInvoiceNumber: "INV001" }); // Start with INV001
    }
  });
};

const getLastOrderNumber = (req, res) => {
  invoiceModel.getLastOrderNumber((err, result) => {
    if (err) {
      console.error("Error fetching last order number:", err);
      return res.status(500).json({ error: "Failed to fetch last order number" });
    }

    if (result.length > 0) {
      // Process invoice numbers to find the next one
      const ordNumbers = result
        .map(row => row.order_number)
        .filter(order => order.startsWith("ORD"))
        .map(order => parseInt(order.slice(3), 10)); // Extract numeric part

      const lastOrderNumber = Math.max(...ordNumbers);
      const nextOrderNumber = `ORD${String(lastOrderNumber + 1).padStart(3, "0")}`;

      res.json({ lastOrderNumber: nextOrderNumber });
    } else {
      res.json({ lastOrderNumber: "ORD001" }); // Start with ORD001
    }
  });
};

const convertOrderToInvoice = async (req, res) => {
  const { order_number } = req.body;
  if (!order_number) {
    return res.status(400).json({ success: false, message: 'order_number is required' });
  }

  try {
    // Fetch order details
    const orderDetails = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM repair_details WHERE order_number = ?', [order_number], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Ensure orderDetails is not empty
    if (!orderDetails || orderDetails.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Fetch the last invoice number to generate the next one
    const lastInvoiceNumberResult = await new Promise((resolve, reject) => {
      db.query('SELECT invoice_number FROM repair_details ORDER BY invoice_number DESC LIMIT 1', (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    let nextInvoiceNumber = 'INV001'; // Default start if no invoices exist

    if (lastInvoiceNumberResult.length > 0 && lastInvoiceNumberResult[0].invoice_number) {
      const lastInvoiceNumber = lastInvoiceNumberResult[0].invoice_number;
      const invNumbers = lastInvoiceNumber.slice(3).padStart(3, '0');
      const nextInvoiceNum = parseInt(invNumbers, 10) + 1;
      nextInvoiceNumber = `INV${String(nextInvoiceNum).padStart(3, '0')}`;
    }

    // Update the previous orders with "converted" status and set new invoice number
    await new Promise((resolve, reject) => {
      db.query(
        `UPDATE repair_details SET invoice_number = ?, invoice = 'Converted' WHERE order_number = ?`,
        [nextInvoiceNumber, order_number],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });

    // Insert into repair_details table
    const insertPromises = orderDetails.map((order) => {
      return new Promise((resolve, reject) => {
        db.query(
          `INSERT INTO repair_details (
            customer_id, mobile, account_name, email, address1, address2, city, 
            pincode, state, state_code, aadhar_card, gst_in, pan_card, terms, date, 
            invoice_number, code, product_id, opentag_id, metal, product_name, metal_type, 
            design_name, purity, category, sub_category, gross_weight, stone_weight, 
            weight_bw, stone_price, va_on, va_percent, wastage_weight, total_weight_av, 
            mc_on, mc_per_gram, making_charges, disscount_percentage, disscount, rate, 
            rate_amt, tax_percent, tax_amt, total_price, cash_amount, card_amount, 
            card_amt, chq, chq_amt, online, online_amt, transaction_status, qty, 
            product_image, taxable_amount, tax_amount, net_amount, old_exchange_amt, 
            scheme_amt, receipts_amt, bal_after_receipts, bal_amt, net_bill_amount, paid_amt, order_number, invoice, customerImage
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.customer_id, order.mobile, order.account_name, order.email, order.address1, order.address2, order.city, 
            order.pincode, order.state, order.state_code, order.aadhar_card, order.gst_in, order.pan_card, order.terms, order.date, 
            nextInvoiceNumber, order.code, order.product_id, order.opentag_id, order.metal, order.product_name, order.metal_type, 
            order.design_name, order.purity, order.category, order.sub_category, order.gross_weight, order.stone_weight, 
            order.weight_bw, order.stone_price, order.va_on, order.va_percent, order.wastage_weight, order.total_weight_av, 
            order.mc_on, order.mc_per_gram, order.making_charges, order.disscount_percentage, order.disscount, order.rate, 
            order.rate_amt, order.tax_percent, order.tax_amt, order.total_price, order.cash_amount, order.card_amount, 
            order.card_amt, order.chq, order.chq_amt, order.online, order.online_amt, 'ConvertedInvoice', order.qty, 
            order.product_image, order.taxable_amount, order.tax_amount, order.net_amount, order.old_exchange_amt, 
            order.scheme_amt, order.receipts_amt, order.bal_after_receipts, order.bal_amt, order.net_bill_amount,
             order.paid_amt, order.order_number, 'Converted', order.customerImage
          ], (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
      });
    });
    await Promise.all(insertPromises);

    res.json({ success: true, message: 'Orders converted successfully', invoice_number: nextInvoiceNumber });

  } catch (error) {
    console.error('Error converting order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Controller for fetching invoice number based on order_number
const getInvoiceByOrderNumber = async (req, res) => {
  const { order_number } = req.params;

  if (!order_number) {
    return res.status(400).json({ success: false, message: "order_number is required" });
  }

  try {
    const invoice = await invoiceModel.findInvoiceByOrderNumber(order_number);

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found for this order number" });
    }

    res.json({ success: true, data: invoice }); // returning full invoice details
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateRepairStatus = (req, res) => {
  const { id } = req.params;
  const { sale_status } = req.body;

  invoiceModel.updateRepairStatus(id, sale_status, (err, result) => {
    if (err) {
      console.error('Error updating repair status:', err);
      return res.status(500).json({ error: 'Error updating status' });
    }
    res.status(200).json({ message: 'Status updated successfully' });
  });
};





module.exports = { getLastInvoiceNumber, getLastOrderNumber, convertOrderToInvoice, getInvoiceByOrderNumber, updateRepairStatus };
