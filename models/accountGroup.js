const db = require('./../db');

const getAccountsGroupNames = (callback) => {
  const query = 'SELECT `AccountsGroupName` FROM `accountgroup`';
  db.query(query, (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

const addState = (state_name, state_code, callback) => {
  const query = "INSERT INTO states (state_name, state_code) VALUES (?, ?)";
  db.query(query, [state_name, state_code], (err, result) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, result.insertId);
  });
};

// Function to fetch all states
const getAllStates = (callback) => {
  const query = "SELECT * FROM states";
  db.query(query, (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

module.exports = {
  getAccountsGroupNames,
  addState,
  getAllStates,
};
