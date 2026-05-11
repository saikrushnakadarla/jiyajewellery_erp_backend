const db = require('./../../db');

const getEmployeeCompensationAccounts = (callback) => {
  const query = `SELECT account_id, account_name 
                 FROM account_details 
                 WHERE account_group = 'Employee Compensation'`;
  db.query(query, callback);
};

module.exports = { getEmployeeCompensationAccounts };