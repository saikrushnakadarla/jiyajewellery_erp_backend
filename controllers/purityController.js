const purityModel = require('../models/purityModel');

const createPurity = (req, res) => {
  const { name, metal, purity_percentage, purity, urd_purity, old_purity_desc, cut_issue, skin_print } = req.body;
  const purityData = { 
    name, 
    metal, 
    purity_percentage, 
    purity, 
    urd_purity, 
    old_purity_desc, 
    cut_issue, 
    skin_print 
  };

  purityModel.createPurity(purityData, (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      return res.status(500).json({ error: 'Error inserting data', details: err.message });
    }
    res.status(201).json({ id: result.insertId, message: 'Purity record created' });
  });
};

const getAllPurities = (req, res) => {
  purityModel.getAllPurities((err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Error fetching data', details: err.message });
    }
    res.status(200).json(results);
  });
};

const getPurityById = (req, res) => {
  const { id } = req.params;
  purityModel.getPurityById(id, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Error fetching data', details: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.status(200).json(results[0]);
  });
};

const updatePurityById = (req, res) => {
  const { id } = req.params;
  const { name, metal, purity_percentage, purity, urd_purity, old_purity_desc, cut_issue, skin_print } = req.body;
  const purityData = { 
    name, 
    metal, 
    purity_percentage, 
    purity, 
    urd_purity, 
    old_purity_desc, 
    cut_issue, 
    skin_print 
  };

  purityModel.updatePurityById(id, purityData, (err, result) => {
    if (err) {
      console.error('Error updating data:', err);
      return res.status(500).json({ error: 'Error updating data', details: err.message });
    }
    res.status(200).json({ message: 'Purity record updated' });
  });
};

const deletePurityById = (req, res) => {
  const { id } = req.params;
  purityModel.deletePurityById(id, (err, result) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).json({ error: 'Error deleting data', details: err.message });
    }
    res.status(200).json({ message: 'Purity record deleted' });
  });
};

module.exports = { 
  createPurity, 
  getAllPurities, 
  getPurityById, 
  updatePurityById, 
  deletePurityById 
};