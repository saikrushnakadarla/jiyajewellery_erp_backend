const { fetchAccountNames } = require("./../../models/paymentaccountname/paymentaccountname");

const getAccountNames = (req, res) => {

  const accountGroups = [
    "Expenses (Direct/Mfg.)",
    "Expenses (Indirect/Admn.)",
    "SUPPLIERS",
    "CUSTOMERS",
  ];
  fetchAccountNames(accountGroups, (err, results) => {
    if (err) {
      console.error("Error fetching account names: ", err);
      return res.status(500).send({ error: "Database query error" });
    }
    res.json(results);
  });
};

module.exports = { getAccountNames };
