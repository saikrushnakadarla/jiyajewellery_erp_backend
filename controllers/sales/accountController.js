const { getEmployeeCompensationAccounts } = require('./../../models/sales/accountDetails');

const fetchEmployeeCompensationAccounts = (req, res) => {
  getEmployeeCompensationAccounts((err, results) => {
    if (err) {
      console.error('Error fetching accounts:', err);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }
    res.json(results);
  });
};

module.exports = { fetchEmployeeCompensationAccounts };