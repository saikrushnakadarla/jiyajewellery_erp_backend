const repairModel = require("./../../models/sales/sales");

exports.saveRepairDetails = (req, res) => {
  try {
    const { repairDetails, oldItems = [], memberSchemes = [] } = req.body;

    if (!Array.isArray(repairDetails) || repairDetails.length === 0) {
      return res.status(400).json({ message: "No data to save" });
    }

    const files = req.files || [];

    // Map files to repairDetails
    repairDetails.forEach((detail, index) => {
      detail.product_image = files[index]?.filename || null;
    });

    // Call the insert function with mapped data
    repairModel.insert(repairDetails, oldItems, memberSchemes, (err) => {
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


exports.saveorderDetails = (req, res) => {
  try {
    console.log(req.body); // Log the request body
    let repairDetails;
    try {
      repairDetails = JSON.parse(req.body.repairDetails); // Parse the JSON string
    } catch (error) {
      return res.status(400).json({ message: "Invalid repairDetails format" });
    }

    // Parse oldItems and memberSchemes from the request body
    const oldItems = req.body.oldItems ? JSON.parse(req.body.oldItems) : [];
    const memberSchemes = req.body.memberSchemes ? JSON.parse(req.body.memberSchemes) : [];

    if (!repairDetails || !repairDetails.length) {
      return res.status(400).json({ message: "No data to save" });
    }

    const files = req.files || [];
    
    repairDetails.forEach((detail, index) => {
      // Store only the filename (not the full path)
      detail.product_image = files[index]?.filename || null; 
    });

    repairModel.orderinsert(repairDetails, oldItems, memberSchemes, (err) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Error saving data to the database" });
      }
      res.json({ message: "Data saved successfully" });
    });
  } catch (error) {
    console.error("Error processing request:", error);
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
  const { invoice_number } = req.params;

  if (!invoice_number) {
    return res.status(400).json({ message: "Invoice number is required" });
  }

  repairModel.getByInvoiceNumber(invoice_number, (err, results) => {
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
    };

    const repeatedData = results.map((row) => {
      return {
        code: row.code,
        product_id: row.product_id,
        metal: row.metal,
        product_name: row.product_name,
        metal_type: row.metal_type,
        design_name: row.design_name,
        purity: row.purity,
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
        rate: row.rate,
        rate_amt: row.rate_amt,
        tax_percent: row.tax_percent,
        tax_amt: row.tax_amt,
        total_price: row.total_price,
        assigning: row.assigning,
        product_image: row.product_image ? `/uploads/${row.product_image}` : null,
        worker_name: row.worker_name,
      };
    });

    res.json({ uniqueData, repeatedData });
  });
};


exports.getAllRepairDetailsByInvoiceNumber = (req, res) => {
  try {
    const { invoice_number } = req.params;

    if (!invoice_number) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    // Fetch data from the model
    repairModel.getAllRepairDetailsByInvoiceNumber(invoice_number, (err, results) => {
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

exports.deleteRepairDetails = (req, res) => {
  const { invoiceNumber } = req.params;

  if (!invoiceNumber) {
    return res.status(400).json({ message: 'Invoice number is required' });
  }

  repairModel.deleteRepairDetailsByInvoice(invoiceNumber, (err, result) => {
    if (err) {
      console.error('Error deleting data:', err.message);
      return res.status(500).json({ message: 'Failed to delete data', error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No repair details found with the given invoice number' });
    }

    res.status(200).json({ message: 'Sale Order details deleted successfully' });
  });
};

exports.updateOrderStatus = async (req, res) => {
  const { invoice_number, order_status } = req.body;

  // Validate input
  if (!invoice_number || !order_status) {
    return res.status(400).json({ error: 'invoice_number and order_status are required' });
  }

  try {
    // Update order_status based on invoice_number
    const result = await repairModel.updateStatus(invoice_number, order_status);

    if (result) {
      return res.status(200).json({ message: 'Order status updated successfully' });
    } else {
      return res.status(404).json({ error: 'No record found with the given invoice_number' });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
};









const repairModel = require("./../../models/sales/sales");
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../../uploads/");
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

exports.saveorderDetails = (req, res) => {
  try {
    console.log(req.body);
    let repairDetails;
    try {
      repairDetails = JSON.parse(req.body.repairDetails);
    } catch (error) {
      return res.status(400).json({ message: "Invalid repairDetails format" });
    }

    // Parse oldItems and memberSchemes
    const oldItems = req.body.oldItems ? JSON.parse(req.body.oldItems) : [];
    const memberSchemes = req.body.memberSchemes ? JSON.parse(req.body.memberSchemes) : [];

    if (!repairDetails || !repairDetails.length) {
      return res.status(400).json({ message: "No data to save" });
    }

    // Handle uploaded files
    const files = req.files || [];
    repairDetails.forEach((detail, index) => {
      // If there's a file uploaded for this detail, use its filename
      if (files[index]) {
        detail.product_image = files[index].filename;
      } else {
        detail.product_image = null;
      }
    });

    repairModel.orderinsert(repairDetails, oldItems, memberSchemes, (err) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Error saving data to the database" });
      }
      res.json({ message: "Data saved successfully" });
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(400).json({ message: "Invalid data format" });
  }
};


exports.saveRepairDetails = (req, res) => {
  try {
    const { repairDetails, oldItems = [], memberSchemes = [] } = req.body;

    if (!Array.isArray(repairDetails) || repairDetails.length === 0) {
      return res.status(400).json({ message: "No data to save" });
    }

    const files = req.files || [];

    // Map files to repairDetails
    repairDetails.forEach((detail, index) => {
      detail.product_image = files[index]?.filename || null;
    });

    // Call the insert function with mapped data
    repairModel.insert(repairDetails, oldItems, memberSchemes, (err) => {
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
  const { invoice_number } = req.params;

  if (!invoice_number) {
    return res.status(400).json({ message: "Invoice number is required" });
  }

  repairModel.getByInvoiceNumber(invoice_number, (err, results) => {
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
    };

    const repeatedData = results.map((row) => {
      return {
        code: row.code,
        product_id: row.product_id,
        metal: row.metal,
        product_name: row.product_name,
        metal_type: row.metal_type,
        design_name: row.design_name,
        purity: row.purity,
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
        rate: row.rate,
        rate_amt: row.rate_amt,
        tax_percent: row.tax_percent,
        tax_amt: row.tax_amt,
        total_price: row.total_price,
        assigning: row.assigning,
        product_image: row.product_image ? `/uploads/${row.product_image}` : null,
        worker_name: row.worker_name,
      };
    });

    res.json({ uniqueData, repeatedData });
  });
};


exports.getAllRepairDetailsByInvoiceNumber = (req, res) => {
  try {
    const { invoice_number } = req.params;

    if (!invoice_number) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    // Fetch data from the model
    repairModel.getAllRepairDetailsByInvoiceNumber(invoice_number, (err, results) => {
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

exports.deleteRepairDetails = (req, res) => {
  const { invoiceNumber } = req.params;

  if (!invoiceNumber) {
    return res.status(400).json({ message: 'Invoice number is required' });
  }

  repairModel.deleteRepairDetailsByInvoice(invoiceNumber, (err, result) => {
    if (err) {
      console.error('Error deleting data:', err.message);
      return res.status(500).json({ message: 'Failed to delete data', error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No repair details found with the given invoice number' });
    }

    res.status(200).json({ message: 'Sale Order details deleted successfully' });
  });
};

exports.updateOrderStatus = async (req, res) => {
  const { invoice_number, order_status } = req.body;

  // Validate input
  if (!invoice_number || !order_status) {
    return res.status(400).json({ error: 'invoice_number and order_status are required' });
  }

  try {
    // Update order_status based on invoice_number
    const result = await repairModel.updateStatus(invoice_number, order_status);

    if (result) {
      return res.status(200).json({ message: 'Order status updated successfully' });
    } else {
      return res.status(404).json({ error: 'No record found with the given invoice_number' });
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
};
