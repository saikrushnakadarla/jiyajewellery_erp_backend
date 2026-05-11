const ledgerModel = require('./../models/ledgermodel');

// Get all ledger entries
const getAllLedgerEntries = (req, res) => {
  ledgerModel.getAllLedgerEntries((err, results) => {
    if (err) {
      console.error('Error fetching ledger entries:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
};

// Get ledger entry by ID
const getLedgerEntryById = (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  ledgerModel.getLedgerEntryById(id, (err, result) => {
    if (err) {
      console.error('Error fetching ledger entry:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (!result) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }
    res.json(result);
  });
};

// Get ledger entries by account ID
const getLedgerEntriesByAccountId = (req, res) => {
  const { account_id } = req.params;
  
  if (!account_id) {
    return res.status(400).json({ error: "Account ID is required" });
  }

  ledgerModel.getLedgerEntriesByAccountId(account_id, (err, results) => {
    if (err) {
      console.error('Error fetching ledger entries by account ID:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
};

// Create new ledger entry with running balance
const createLedgerEntry = async (req, res) => {
  try {
    let {
      transaction_date,
      transaction_type,
      invoice_number,
      credit,
      debit,
      net_wt,
      gross_wt,
      amount,
      account_id
    } = req.body;

    console.log("========== LEDGER API CALL ==========");
    console.log("Raw received data:", JSON.stringify(req.body, null, 2));

    // Helper function for rounding to whole numbers
    const roundToWholeNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      let num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return 0;
      return Math.round(num);
    };

    const roundTo3 = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      let num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return 0;
      return Math.round(num * 1000) / 1000;
    };

    // Validate required fields
    if (!transaction_date || !transaction_type) {
      return res.status(400).json({ error: "Transaction date and transaction type are required." });
    }

    if (!account_id) {
      return res.status(400).json({ error: "Account ID is required for ledger entry." });
    }

    // Round all numeric values to whole numbers
    const validCredit = roundToWholeNumber(credit);
    const validDebit = roundToWholeNumber(debit);
    const validNetWt = roundTo3(net_wt);
    const validGrossWt = roundTo3(gross_wt);
    const validAmount = roundToWholeNumber(amount);

    console.log("After rounding to whole numbers:");
    console.log(`  Credit: ${validCredit} (original: ${credit})`);
    console.log(`  Debit: ${validDebit} (original: ${debit})`);
    console.log(`  Amount: ${validAmount} (original: ${amount})`);
    console.log(`  Net Wt: ${validNetWt}`);
    console.log(`  Gross Wt: ${validGrossWt}`);

    // Get the latest balance for this account_id
    let previousBalance = 0;
    
    const latestBalance = await new Promise((resolve, reject) => {
      ledgerModel.getLatestBalanceByAccountId(account_id, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
    
    previousBalance = latestBalance ? roundToWholeNumber(latestBalance.balance) : 0;
    console.log(`Previous balance for account ${account_id}: ${previousBalance}`);

    // Calculate new balance based on transaction type
    let newBalance;
    const transactionTypeUpper = transaction_type.toUpperCase();
    
    if (transactionTypeUpper === 'SALE' || transactionTypeUpper === 'DEBIT') {
      // For SALE/DEBIT: add to balance (customer owes money)
      newBalance = roundToWholeNumber(previousBalance + validDebit);
      console.log(`SALE/DEBIT transaction: ${previousBalance} + ${validDebit} = ${newBalance}`);
    } 
    else if (transactionTypeUpper === 'RECEIPT' || transactionTypeUpper === 'PAYMENT' || transactionTypeUpper === 'CREDIT') {
      // For RECEIPT/PAYMENT/CREDIT: subtract from balance (customer pays)
      newBalance = roundToWholeNumber(previousBalance - validCredit);
      console.log(`RECEIPT/PAYMENT transaction: ${previousBalance} - ${validCredit} = ${newBalance}`);
    } 
    else {
      // Default case
      newBalance = roundToWholeNumber(previousBalance + validDebit - validCredit);
      console.log(`Default transaction: ${previousBalance} + ${validDebit} - ${validCredit} = ${newBalance}`);
    }

    // Validate newBalance is a number
    if (isNaN(newBalance) || !isFinite(newBalance)) {
      console.error('Calculated newBalance is invalid:', {
        previousBalance,
        validDebit,
        validCredit,
        transaction_type,
        newBalance
      });
      return res.status(400).json({ 
        error: "Invalid balance calculation", 
        details: { previousBalance, validDebit, validCredit, transaction_type }
      });
    }

    console.log(`Final - Account ID: ${account_id}`);
    console.log(`Previous Balance: ${previousBalance}`);
    console.log(`Transaction Type: ${transaction_type}`);
    console.log(`New Balance (rounded to whole number): ${newBalance}`);

    // Prepare data for insertion
    const ledgerEntryData = {
      transaction_date: transaction_date,
      transaction_type: transactionTypeUpper,
      invoice_number: invoice_number || null,
      credit: validCredit,
      debit: validDebit,
      balance: newBalance,
      net_wt: validNetWt,
      gross_wt: validGrossWt,
      amount: validAmount,
      account_id: parseInt(account_id)
    };

    console.log("Data to insert:", JSON.stringify(ledgerEntryData, null, 2));

    // Create ledger entry with calculated balance
    const entryId = await new Promise((resolve, reject) => {
      ledgerModel.createLedgerEntry(ledgerEntryData, (err, entry_id) => {
        if (err) {
          console.error("Database insert error:", err);
          reject(err);
        } else {
          resolve(entry_id);
        }
      });
    });

    console.log(`Ledger entry created with ID: ${entryId}`);
    console.log("========== LEDGER API END ==========");

    res.status(201).json({
      success: true,
      message: "Ledger entry created successfully.",
      entry_id: entryId,
      previous_balance: previousBalance,
      current_balance: newBalance,
      rounded_values: {
        debit: validDebit,
        credit: validCredit,
        balance: newBalance,
        amount: validAmount
      }
    });
  } catch (error) {
    console.error("Error creating ledger entry:", error);
    return res.status(500).json({ 
      error: "Database error while creating ledger entry.", 
      details: error.message,
      stack: error.stack 
    });
  }
};
// Update ledger entry by ID
const updateLedgerEntry = (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  ledgerModel.updateLedgerEntry(id, updateData, (err, result) => {
    if (err) {
      console.error("Error updating ledger entry:", err);
      return res.status(500).json({ error: "Database error." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ledger entry not found" });
    }

    res.status(200).json({
      message: "Ledger entry updated successfully.",
    });
  });
};

// Delete ledger entry by ID
const deleteLedgerEntry = (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  ledgerModel.deleteLedgerEntry(id, (err, result) => {
    if (err) {
      console.error("Error deleting ledger entry:", err);
      return res.status(500).json({ error: "Database error." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ledger entry not found" });
    }

    res.status(200).json({
      message: "Ledger entry deleted successfully.",
    });
  });
};

// Get ledger entries by transaction type
const getLedgerEntriesByType = (req, res) => {
  const { transaction_type } = req.params;

  if (!transaction_type) {
    return res.status(400).json({ error: "Transaction type is required" });
  }

  ledgerModel.getLedgerEntriesByType(transaction_type, (err, results) => {
    if (err) {
      console.error("Error fetching ledger entries by type:", err);
      return res.status(500).json({ error: "Database error." });
    }
    res.status(200).json(results);
  });
};

// Get ledger entries by date range
const getLedgerEntriesByDateRange = (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  ledgerModel.getLedgerEntriesByDateRange(start_date, end_date, (err, results) => {
    if (err) {
      console.error("Error fetching ledger entries by date range:", err);
      return res.status(500).json({ error: "Database error." });
    }
    res.status(200).json(results);
  });
};

// Get ledger entries by date range and account ID
const getLedgerEntriesByDateRangeAndAccount = (req, res) => {
  const { start_date, end_date, account_id } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  if (!account_id) {
    return res.status(400).json({ error: "Account ID is required" });
  }

  ledgerModel.getLedgerEntriesByDateRangeAndAccount(start_date, end_date, account_id, (err, results) => {
    if (err) {
      console.error("Error fetching ledger entries by date range and account:", err);
      return res.status(500).json({ error: "Database error." });
    }
    res.status(200).json(results);
  });
};

// Get ledger summary by account ID
const getLedgerSummaryByAccountId = (req, res) => {
  const { account_id } = req.params;

  if (!account_id) {
    return res.status(400).json({ error: "Account ID is required" });
  }

  ledgerModel.getLedgerSummaryByAccountId(account_id, (err, results) => {
    if (err) {
      console.error("Error fetching ledger summary:", err);
      return res.status(500).json({ error: "Database error." });
    }
    res.status(200).json(results);
  });
};

module.exports = {
  getAllLedgerEntries,
  getLedgerEntryById,
  getLedgerEntriesByAccountId,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  getLedgerEntriesByType,
  getLedgerEntriesByDateRange,
  getLedgerEntriesByDateRangeAndAccount,
  getLedgerSummaryByAccountId
};