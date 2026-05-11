// controllers/designMasterController.js
const designMasterModel = require('../models/designMasterModel');

// Create a new DesignMaster record
const createDesignMaster = (req, res) => {
  const data = req.body;
  designMasterModel.createDesignMaster(data, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error inserting data');
    } else {
      res.status(201).send({ id: result.insertId, message: 'DesignMaster record created' });
    }
  });
};

// Get all DesignMaster records
const getAllDesignMasters = (req, res) => {
  designMasterModel.getAllDesignMasters((err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    } else {
      res.status(200).send(results);
    }
  });
};

// Get a single DesignMaster record by ID
const getDesignMasterById = (req, res) => {
  const { id } = req.params;
  designMasterModel.getDesignMasterById(id, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    } else if (results.length === 0) {
      res.status(404).send('Record not found');
    } else {
      res.status(200).send(results[0]);
    }
  });
};

// Update a DesignMaster record by ID
const updateDesignMaster = (req, res) => {
  const { id } = req.params;
  const data = req.body;
  designMasterModel.updateDesignMaster(id, data, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error updating data');
    } else {
      res.status(200).send({ message: 'DesignMaster record updated' });
    }
  });
};

// Delete a DesignMaster record by ID
const deleteDesignMaster = (req, res) => {
  const { id } = req.params;
  designMasterModel.deleteDesignMaster(id, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error deleting data');
    } else {
      res.status(200).send({ message: 'DesignMaster record deleted' });
    }
  });
};

module.exports = {
  createDesignMaster,
  getAllDesignMasters,
  getDesignMasterById,
  updateDesignMaster,
  deleteDesignMaster
};
