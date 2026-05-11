const db = require('./../db');

// Get all ledger entries
const getAllLedgerEntries = (callback) => {
  const query = 'SELECT * FROM ledger ORDER BY transaction_date DESC, id DESC';
  db.query(query, (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

// Get ledger entry by ID
const getLedgerEntryById = (id, callback) => {
  const query = 'SELECT * FROM ledger WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results[0]);
  });
};

// Get ledger entries by account ID
const getLedgerEntriesByAccountId = (account_id, callback) => {
  const query = 'SELECT * FROM ledger WHERE account_id = ? ORDER BY transaction_date ASC, id ASC';
  db.query(query, [account_id], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

// Get latest balance for a specific account_id
const getLatestBalanceByAccountId = (account_id, callback) => {
  const query = 'SELECT balance FROM ledger WHERE account_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 1';
  db.query(query, [account_id], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    // Round the balance to whole number if it exists
    if (results && results[0] && results[0].balance) {
      results[0].balance = Math.round(parseFloat(results[0].balance));
    }
    callback(null, results[0]);
  });
};
// Create new ledger entry
const createLedgerEntry = (data, callback) => {
  // Helper function for rounding to whole numbers
  const roundToWholeNumber = (value) => {
    if (value === null || value === undefined || isNaN(parseFloat(value))) return 0;
    return Math.round(parseFloat(value));
  };

  const roundTo3 = (value) => {
    if (value === null || value === undefined || isNaN(parseFloat(value))) return 0;
    return Math.round(parseFloat(value) * 1000) / 1000;
  };

  // Round all numeric values to whole numbers
  const roundedCredit = roundToWholeNumber(data.credit);
  const roundedDebit = roundToWholeNumber(data.debit);
  const roundedBalance = roundToWholeNumber(data.balance);
  const roundedNetWt = roundTo3(data.net_wt);
  const roundedGrossWt = roundTo3(data.gross_wt);
  const roundedAmount = roundToWholeNumber(data.amount);

  console.log("Model - Inserting rounded values:");
  console.log(`  Credit: ${roundedCredit}`);
  console.log(`  Debit: ${roundedDebit}`);
  console.log(`  Balance: ${roundedBalance}`);
  console.log(`  Amount: ${roundedAmount}`);

  const query = `INSERT INTO ledger 
    (transaction_date, transaction_type, invoice_number, credit, debit, balance, net_wt, gross_wt, amount, account_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    query,
    [
      data.transaction_date,
      data.transaction_type,
      data.invoice_number,
      roundedCredit,
      roundedDebit,
      roundedBalance,
      roundedNetWt,
      roundedGrossWt,
      roundedAmount,
      data.account_id || null
    ],
    (err, result) => {
      if (err) {
        console.error("Database insert error:", err);
        return callback(err, null);
      }
      console.log(`Insert successful, ID: ${result.insertId}`);
      callback(null, result.insertId);
    }
  );
};

// Update ledger entry
const updateLedgerEntry = (id, data, callback) => {
  const query = `UPDATE ledger SET 
    transaction_date = COALESCE(?, transaction_date),
    transaction_type = COALESCE(?, transaction_type),
    invoice_number = COALESCE(?, invoice_number),
    credit = COALESCE(?, credit),
    debit = COALESCE(?, debit),
    balance = COALESCE(?, balance),
    net_wt = COALESCE(?, net_wt),
    gross_wt = COALESCE(?, gross_wt),
    amount = COALESCE(?, amount),
    account_id = COALESCE(?, account_id)
    WHERE id = ?`;

  db.query(
    query,
    [
      data.transaction_date,
      data.transaction_type,
      data.invoice_number,
      data.credit,
      data.debit,
      data.balance,
      data.net_wt,
      data.gross_wt,
      data.amount,
      data.account_id,
      id
    ],
    (err, result) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, result);
    }
  );
};

// Delete ledger entry
const deleteLedgerEntry = (id, callback) => {
  const query = 'DELETE FROM ledger WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
};

// Get ledger entries by transaction type
const getLedgerEntriesByType = (transaction_type, callback) => {
  const query = 'SELECT * FROM ledger WHERE transaction_type = ? ORDER BY transaction_date DESC';
  db.query(query, [transaction_type], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

// Get ledger entries by date range
const getLedgerEntriesByDateRange = (start_date, end_date, callback) => {
  const query = 'SELECT * FROM ledger WHERE transaction_date BETWEEN ? AND ? ORDER BY transaction_date DESC';
  db.query(query, [start_date, end_date], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

// Get ledger entries by date range and account ID
const getLedgerEntriesByDateRangeAndAccount = (start_date, end_date, account_id, callback) => {
  const query = 'SELECT * FROM ledger WHERE transaction_date BETWEEN ? AND ? AND account_id = ? ORDER BY transaction_date DESC';
  db.query(query, [start_date, end_date, account_id], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

// Get ledger summary by account ID
const getLedgerSummaryByAccountId = (account_id, callback) => {
  const query = `SELECT 
    SUM(credit) as total_credit,
    SUM(debit) as total_debit,
    MAX(balance) as current_balance,
    SUM(net_wt) as total_net_wt,
    SUM(gross_wt) as total_gross_wt,
    SUM(amount) as total_amount,
    COUNT(*) as total_entries
    FROM ledger WHERE account_id = ?`;

  db.query(query, [account_id], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results[0]);
  });
};

module.exports = {
  getAllLedgerEntries,
  getLedgerEntryById,
  getLedgerEntriesByAccountId,
  getLatestBalanceByAccountId,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  getLedgerEntriesByType,
  getLedgerEntriesByDateRange,
  getLedgerEntriesByDateRangeAndAccount,
  getLedgerSummaryByAccountId
};