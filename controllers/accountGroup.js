const accountsgroupModel = require('./../models/accountGroup');

const getAccountsGroup = (req, res) => {
  accountsgroupModel.getAccountsGroupNames((err, results) => {
    if (err) {
      console.error('Error fetching accounts group names:', err);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
};

const addState = (req, res) => {
  const { state_name, state_code } = req.body;

  // Validate request body
  if (!state_name || !state_code) {
    return res.status(400).json({ error: "State name and state code are required." });
  }

  // Call model to add the state
  accountsgroupModel.addState(state_name, state_code, (err, state_id) => {
    if (err) {
      console.error("Error inserting state:", err);
      return res.status(500).json({ error: "Database error." });
    }

    res.status(201).json({
      message: "State added successfully.",
      state_id,
    });
  });
};

const getStates = (req, res) => {
  accountsgroupModel.getAllStates((err, results) => {
    if (err) {
      console.error("Error fetching states:", err);
      return res.status(500).json({ error: "Database error." });
    }

    res.status(200).json(results);
  });
};

module.exports = {
  getAccountsGroup,
  addState,
  getStates,

};
