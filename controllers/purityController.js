const purityModel = require('../models/purityModel');

const createPurity = (req, res) => {
  const { name, metal, purity_percentage, purity, urd_purity, desc, old_purity_desc, cut_issue, skin_print } = req.body;
  const purityData = { name, metal, purity_percentage, purity, urd_purity, desc, old_purity_desc, cut_issue, skin_print };

  purityModel.createPurity(purityData, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error inserting data');
    }
    res.status(201).send({ id: result.insertId, message: 'Purity record created' });
  });
};

const getAllPurities = (req, res) => {
  purityModel.getAllPurities((err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data');
    }
    res.status(200).send(results);
  });
};

const getPurityById = (req, res) => {
  const { id } = req.params;
  purityModel.getPurityById(id, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data');
    }
    if (results.length === 0) {
      return res.status(404).send('Record not found');
    }
    res.status(200).send(results[0]);
  });
};

const updatePurityById = (req, res) => {
  const { id } = req.params;
  const { name, metal, purity_percentage, purity, urd_purity, desc, old_purity_desc, cut_issue, skin_print } = req.body;
  const purityData = { name, metal, purity_percentage, purity, urd_purity, desc, old_purity_desc, cut_issue, skin_print };

  purityModel.updatePurityById(id, purityData, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error updating data');
    }
    res.status(200).send({ message: 'Purity record updated' });
  });
};

const deletePurityById = (req, res) => {
  const { id } = req.params;
  purityModel.deletePurityById(id, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error deleting data');
    }
    res.status(200).send({ message: 'Purity record deleted' });
  });
};

module.exports = { createPurity, getAllPurities, getPurityById, updatePurityById, deletePurityById };
