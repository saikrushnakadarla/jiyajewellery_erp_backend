const db = require("./../../db");

const fetchAccountNames = (accountGroups, callback) => {
  const query = `
    SELECT account_name, mobile
    FROM account_details
    WHERE account_group IN (?, ?, ?, ?, ? , ?)
  `;
  db.query(query, accountGroups, callback);
};

module.exports = { fetchAccountNames };
