
const metalTypeModel = require('../models/metalTypeModel');

const createMetalType = (req, res) => {
  const data = req.body;
  metalTypeModel.createMetalType(data, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error inserting data');
    } else {
      res.status(201).send({ id: result.insertId, message: 'MetalType record created' });
    }
  });
};

const getAllMetalTypes = (req, res) => {
  metalTypeModel.getAllMetalTypes((err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data');
    } else {
      res.status(200).send(results);
    }
  });
};

const getMetalTypeById = (req, res) => {
  const { id } = req.params;
  metalTypeModel.getMetalTypeById(id, (err, results) => {
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

const updateMetalType = (req, res) => {
  const { id } = req.params;
  const data = req.body;

  metalTypeModel.updateMetalType(id, data, (err, result) => {
    if (err) {
      console.error("Error updating metaltype:", err);
      res.status(500).send({ message: "Error updating data" });
    } else {
      if (result.affectedRows === 0) {
        res.status(404).send({ message: "No record found with this ID" });
      } else {
        res.status(200).send({ message: "MetalType record updated successfully" });
      }
    }
  });
};


const deleteMetalType = (req, res) => {
  const { id } = req.params;
  metalTypeModel.deleteMetalType(id, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error deleting data');
    } else {
      res.status(200).send({ message: 'MetalType record deleted' });
    }
  });
};

module.exports = {
  createMetalType,
  getAllMetalTypes,
  getMetalTypeById,
  updateMetalType,
  deleteMetalType
};
