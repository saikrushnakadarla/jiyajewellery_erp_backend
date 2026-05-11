// const repairModel = require("./../../models/sales/sales");
// const db = require("./../../db");
const repairModel = require("./../../models/sales/orders");
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, "../../uploads/");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

exports.saveorderDetails = (req, res) => {
  try {
    const { orderDetails, oldItems = [], memberSchemes = [], salesNetAmount, advanceAmount, customerImage } = req.body;

    if (!Array.isArray(orderDetails) || orderDetails.length === 0) {
      return res.status(400).json({ message: "No data to save" });
    }

    const files = req.files || [];

    // Map files to orderDetails
    orderDetails.forEach((detail, index) => {
      detail.product_image = files[index]?.filename || null;
    });

    // Call the insert function with mapped data
    repairModel.orderinsert(orderDetails, oldItems, memberSchemes, salesNetAmount, advanceAmount, customerImage, (err) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Error saving data to the database" });
      }
      res.json({ message: "Data saved successfully" });
    });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(400).json({ message: "Invalid data format" });
  }
};

exports.getAllUniqueRepairDetails = (req, res) => {
  repairModel.getAllUniqueInvoices((err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Error fetching data" });
    }
    res.json(results);
  });
};

exports.getRepairDetailsByInvoiceNumber = (req, res) => {
  const { order_number } = req.params;

  if (!order_number) {
    return res.status(400).json({ message: "Invoice number is required" });
  }

  repairModel.getByInvoiceNumber(order_number, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Error fetching data" });
    }

    if (!results.length) {
      return res.status(404).json({ message: "No data found for the given invoice number" });
    }

    // Extract unique and repeated data
    const uniqueData = {
      customer_id: results[0].customer_id,
      mobile: results[0].mobile,
      account_name: results[0].account_name,
      email: results[0].email,
      address1: results[0].address1,
      address2: results[0].address2,
      city: results[0].city,
      pincode: results[0].pincode,
      state: results[0].state,
      state_code: results[0].state_code,
      aadhar_card: results[0].aadhar_card,
      gst_in: results[0].gst_in,
      pan_card: results[0].pan_card,
      terms: results[0].terms,
      date: results[0].date,
      order_number: results[0].order_number,
      invoice_number: results[0].invoice_number,
      cash_amount: results[0].cash_amount,
      card_amount: results[0].card_amount,
      card_amt: results[0].card_amt,
      chq: results[0].chq,
      chq_amt: results[0].chq_amt,
      online: results[0].online,
      online_amt: results[0].online_amt,
      transaction_status: results[0].transaction_status,
      qty: results[0].qty,
      taxable_amount: results[0].taxable_amount,
      tax_amount: results[0].tax_amount,
      net_amount: results[0].net_amount,
      invoice: results[0].invoice,
    };

    const repeatedData = results.map((row) => {
      return {
        id: row.id,
        customer_id: row.customer_id,
        mobile: row.mobile,
        account_name: row.account_name,
        email: row.email,
        address1: row.address1,
        address2: row.address2,
        city: row.city,
        pincode: row.pincode,
        state: row.state,
        state_code: row.state_code,
        aadhar_card: row.aadhar_card,
        gst_in: row.gst_in,
        pan_card: row.pan_card,
        terms: row.terms,
        date: row.date,
        time: row.time,
        invoice_number: row.invoice_number,
        code: row.code,
        product_id: row.product_id,
        opentag_id: row.opentag_id,
        metal: row.metal,
        product_name: row.product_name,
        metal_type: row.metal_type,
        design_name: row.design_name,
        purity: row.purity,
        selling_purity: row.selling_purity,
        printing_purity: row.printing_purity,
        custom_purity: row.custom_purity,
        pricing: row.pricing,
        category: row.category,
        sub_category: row.sub_category,
        gross_weight: row.gross_weight,
        stone_weight: row.stone_weight,
        weight_bw: row.weight_bw,
        stone_price: row.stone_price,
        va_on: row.va_on,
        va_percent: row.va_percent,
        wastage_weight: row.wastage_weight,
        total_weight_av: row.total_weight_av,
        mc_on: row.mc_on,
        mc_per_gram: row.mc_per_gram,
        making_charges: row.making_charges,
        disscount_percentage: row.disscount_percentage,
        disscount: row.disscount,
        festival_discount: row.festival_discount,
        rate: row.rate,
        rate_24k: row.rate_24k,
        pieace_cost: row.pieace_cost,
        mrp_price: row.mrp_price,
        rate_amt: row.rate_amt,
        tax_percent: row.tax_percent,
        tax_amt: row.tax_amt,
        original_total_price: row.original_total_price,
        total_price: row.total_price,
        cash_amount: row.cash_amount,
        card_amount: row.card_amount,
        card_amt: row.card_amt,
        chq: row.chq,
        chq_amt: row.chq_amt,
        online: row.online,
        online_amt: row.online_amt,
        transaction_status: row.transaction_status,
        qty: row.qty,
        product_image: row.product_image ? `/uploads/${row.product_image}` : null,
        imagePreview: row.imagePreview,
        order_number: row.order_number,
        invoice: row.invoice,
        hm_charges: row.hm_charges,
        remarks: row.remarks,
        sale_status: row.sale_status,
        taxable_amount: row.taxable_amount,
        tax_amount: row.tax_amount,
        net_amount: row.net_amount,
        old_exchange_amt: row.old_exchange_amt,
        scheme_amt: row.scheme_amt,
        sale_return_amt: row.sale_return_amt,
        advance_amt: row.advance_amt,
        receipts_amt: row.receipts_amt,
        bal_after_receipts: row.bal_after_receipts,
        bal_amt: row.bal_amt,
        net_bill_amount: row.net_bill_amount,
        paid_amt: row.paid_amt,
        piece_taxable_amt: row.piece_taxable_amt,
        original_piece_taxable_amt: row.original_piece_taxable_amt,
        customerImage: row.customerImage,
        size: row.size
      };
    });


    res.json({ uniqueData, repeatedData });
  });
};

exports.getAllRepairDetailsByInvoiceNumber = (req, res) => {
  try {
    const { order_number } = req.params;

    if (!order_number) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    // Fetch data from the model
    repairModel.getAllRepairDetailsByInvoiceNumber(order_number, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Error fetching data from the database" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "No repair details found for the given invoice number" });
      }

      res.json(results); // Send the fetched repair details as JSON
    });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(400).json({ message: "Invalid request" });
  }
};

exports.getAllRepairDetails = (req, res) => {
  repairModel.getRepairDetails((err, results) => {
    if (err) {
      console.error('Error fetching data:', err.message);
      return res.status(500).json({ message: 'Failed to fetch data', error: err.message });
    }
    res.status(200).json(results);
  });
};

exports.updateOrderStatus = async (req, res) => {
  const { order_number, order_status } = req.body;

  console.log("Incoming Request Body:", req.body); // Debugging

  // Validate input
  if (!order_number || !order_status) {
    return res.status(400).json({ error: "order_number and order_status are required" });
  }

  try {
    // Update order_status based on order_number
    const result = await repairModel.updateStatus(order_number, order_status);

    if (result) {
      return res.status(200).json({ message: "Order status updated successfully" });
    } else {
      return res.status(404).json({ error: "No record found with the given order_number" });
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Failed to update order status" });
  }
};

exports.deleteOrderDetails = (req, res) => {
  const { orderNumber } = req.params;
  const { skipMessage } = req.query;

  if (!orderNumber) {
    return res.status(400).json({ message: 'Invoice number is required' });
  }

  repairModel.deleteOrderDetailsByInvoice(orderNumber, (err, result) => {
    if (err) {
      console.error('Error deleting data:', err.message);
      return res.status(500).json({ message: 'Failed to delete data', error: err.message });
    }

    if (skipMessage === 'true') {
      return res.sendStatus(204);
    }

    res.status(200).json(result);
  });
};







