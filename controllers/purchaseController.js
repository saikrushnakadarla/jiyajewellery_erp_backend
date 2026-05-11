const purchaseModel = require("../models/purchaseModel"); // Ensure correct path

const savePurchase = async (req, res) => {
  const { formData, table_data } = req.body;

  try {
    

    if (!table_data || table_data.length === 0) {
      console.error("Error: Table data is empty.");
      return res.status(400).json({ message: "Table data is empty. Cannot proceed with purchase." });
    }

    // Initialize overall amounts
    let overall_taxableAmt = 0, overall_taxAmt = 0, overall_netAmt = 0, overall_hmCharges = 0;

    // Loop through table_data to calculate overall amounts
    table_data.forEach((row, index) => {
      

      overall_taxableAmt += (parseFloat(row.total_mc) || 0) + (parseFloat(row.total_amount) || 0) + (parseFloat(row.final_stone_amount) || 0);
      overall_taxAmt += parseFloat(row.tax_amt) || 0;
      overall_netAmt += parseFloat(row.net_amt) || 0;
      overall_hmCharges += parseFloat(row.hm_charges) || 0;
    });

    

    // Process each row separately
    await Promise.all(
      table_data.map(async (row, index) => {
        const { id, invoice } = row; // Extract `id` & `invoice` from the current row
       
        const purchaseExists = await purchaseModel.checkInvoiceExists(id, invoice);
        

        // Merge `formData` and `row` while adding overall calculated amounts
        const purchaseData = {
          ...formData,
          ...row,
          overall_taxableAmt,
          overall_taxAmt,
          overall_netAmt,
          overall_hmCharges
        };

        if (purchaseExists) {
          
          await purchaseModel.updatePurchase(purchaseData);
        } else {
          
          const purchaseResult = await purchaseModel.insertPurchase(purchaseData);
          const purchase_id = purchaseResult.insertId;
          

          if (row.stoneDetails && row.stoneDetails.length > 0) {
            
            await Promise.all(
              row.stoneDetails.map((stone, stoneIndex) => {
                console.log(`Inserting stone ${stoneIndex + 1}:`, stone);
                return purchaseModel.insertStoneDetails({
                  purchase_id,
                  ...stone
                });
              })
            );
          }
        }
      })
    );

   
    res.status(200).json({
      message: "Purchases processed successfully",
      overall_taxableAmt,
      overall_taxAmt,
      overall_netAmt,
      overall_hmCharges
    });
  } catch (error) {
    console.error("Error saving purchase:", error);
    res.status(500).json({ message: "Error saving purchase", error: error.message });
  }
};

const getAllUniquePurchaseDetails = (req, res) => {
  purchaseModel.getAllUniqueInvoices((err, results) => {

    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Error fetching data" });
    }
    res.json(results);
  });
};

const getRepairDetailsByInvoiceNumber = (req, res) => {
  const { invoice } = req.params;

  if (!invoice) {
    return res.status(400).json({ message: "Invoice number is required" });
  }

  purchaseModel.getByInvoiceNumber(invoice, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Error fetching data" });
    }

    if (!results.length) {
      return res.status(404).json({ message: "No data found for the given invoice number" });
    }

    const uniqueData = {
      customer_id: results[0].customer_id,
      mobile: results[0].mobile,
      account_name: results[0].account_name,
      gst_in: results[0].gst_in,
      terms: results[0].terms,
      invoice: results[0].invoice,
      bill_no: results[0].bill_no,
      date: results[0].date,
      bill_date: results[0].bill_date,
      due_date: results[0].due_date,
      Pricing: results[0].Pricing,
      overall_total_wt: results[0].overall_total_wt,
      overall_paid_wt: results[0].overall_paid_wt,
      overall_bal_wt: results[0].overall_bal_wt,
      overall_taxableAmt: results[0].overall_taxableAmt,
      overall_taxAmt: results[0].overall_taxAmt,
      overall_netAmt: results[0].overall_netAmt, 
      overall_hmCharges: results[0].overall_hmCharges
    };

    const repeatedData = results.map((row) => ({
      id:row.id,
      invoice: row.invoice,
      customer_id:row.customer_id,
      account_name: row.account_name,
      mobile: row.mobile,
      product_id: row.product_id,
      category: row.category,
      Pricing: row.Pricing,
      metal_type: row.metal_type,
      rbarcode: row.rbarcode,
      hsn_code: row.hsn_code,
      pcs: row.pcs,
      gross_weight: row.gross_weight,
      stone_weight: row.stone_weight,
      deduct_st_Wt: row.deduct_st_Wt,
      net_weight: row.net_weight,
      purity: row.purity,
      purityPercentage:row.purityPercentage,
      pure_weight: row.pure_weight,
      wastage_on: row.wastage_on,
      wastage: row.wastage,
      wastage_wt: row.wastage_wt,
      Making_Charges_On: row.Making_Charges_On,
      Making_Charges_Value: row.Making_Charges_Value,
      total_mc: row.total_mc,
      total_pure_wt: row.total_pure_wt,
      paid_pure_weight: row.paid_pure_weight,
      balance_pure_weight: row.balance_pure_weight,
      rate: row.rate,
      total_amount: row.total_amount,
      tax_slab: row.tax_slab,
      tax_amt: row.tax_amt,
      net_amt: row.net_amt,
      rate_cut: row.rate_cut,
      rate_cut_wt: row.rate_cut_wt,
      paid_amount: row.paid_amount,
      balance_amount: row.balance_amount,
      hm_charges: row.hm_charges,
      charges: row.charges,
      remarks: row.remarks,
      cut: row.cut,
      color: row.color,
      clarity: row.clarity,
      carat_wt: row.carat_wt,
      stone_price: row.stone_price,
      final_stone_amount: row.final_stone_amount,
      balance_after_receipt: row.balance_after_receipt,
      balWt_after_payment: row.balWt_after_payment,
      paid_amt:row.paid_amt,
      paid_wt:row.paid_wt,
      paid_by: row.paid_by,
      bal_wt_amt: row.bal_wt_amt,
      other_charges: row.other_charges,
      overall_taxableAmt: row.overall_taxableAmt,
      overall_taxAmt: row.overall_taxAmt,
      overall_netAmt: row.overall_netAmt, 
      overall_hmCharges: row.overall_hmCharges,
      tag_id:row.tag_id,
      discount_amt:row.discount_amt,
      final_amt:row.final_amt,
      claim_remark:row.claim_remark,
    }));

    res.json({ uniqueData, repeatedData });
  });

};

const getAllRepairDetailsByInvoiceNumber = (req, res) => {
  try {
    const { invoice } = req.params;

    if (!invoice) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    // Fetch data from the model
    purchaseModel.getAllRepairDetailsByInvoiceNumber(invoice, (err, results) => {
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

const getPurchases = (req, res) => {
  purchaseModel.getAllPurchases((err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      res.status(500).json({ message: 'Error fetching data.', error: err });
    } else {

      res.status(200).json(results);
    }
  });
};

const deletePurchase = (req, res) => {
  const { id } = req.params;

  purchaseModel.deletePurchaseAndUpdateProduct(id, (error, results) => {
    if (error) {
      console.error('Error processing deletion:', error.message);
      if (error.message === 'Purchase not found') {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.affectedRows > 0) {
      return res.status(200).json({ message: 'Purchase deleted and product updated successfully' });
    } else {
      return res.status(404).json({ message: 'Purchase not found' });
    }
  });
};

const deletePurchaseByInvoice = (req, res) => {
  const { invoice } = req.params;

  purchaseModel.deletePurchaseByInvoice(invoice, (error, results) => {
    if (error) {
      console.error('Error processing deletion:', error.message);
      if (error.message === 'Purchase not found') {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.affectedRows > 0) {
      return res.status(200).json({ message: 'Purchase Invoice deleted successfully' });
    } else {
      return res.status(404).json({ message: 'Purchase not found' });
    }
  });
};

const getPurchase = async (req, res) => {
  const { id } = req.params;

  try {
    const purchase = await purchaseModel.getPurchaseById(id);
    res.status(200).json(purchase);
  } catch (error) {
    console.error('Error fetching purchase:', error.message);
    if (error.message === 'Purchase not found') {
      res.status(404).json({ message: 'Purchase not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

const updatePurchase = async (req, res) => {
  const { id } = req.params; // Get purchase ID from URL
  const updatedData = req.body; // Updated purchase data from request body

  try {
    const result = await purchaseModel.updatePurchase(id, updatedData);
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Purchase updated successfully.' });
    } else {
      res.status(404).json({ message: 'Purchase not found.' });
    }
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

const updateRemark = (req, res) => {
  const { productId, remark } = req.body;

  if (!productId || !remark) {
    return res.status(400).json({ message: "Product ID and Remark are required" });
  }

  purchaseModel.updateRemark(productId, remark, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database Error", error: err });
    }
    return res.json({ message: "Remark updated successfully", result });
  });
};

module.exports = {
  updatePurchase,
  savePurchase,
  getPurchases,
  deletePurchase,
  deletePurchaseByInvoice,
  getPurchase,
  getAllUniquePurchaseDetails,
  getRepairDetailsByInvoiceNumber,
  getAllRepairDetailsByInvoiceNumber,
  updateRemark
};