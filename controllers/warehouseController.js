// warehouseController.js
const warehouseModel = require('../models/warehouseModal');

const createWarehouse = (req, res) => {
  const { warehouse_name, location, status } = req.body;
  
  // Validate required fields
  if (!warehouse_name || !location) {
    return res.status(400).send({ 
      message: 'Warehouse name and location are required' 
    });
  }
  
  const warehouseData = { 
    warehouse_name, 
    location, 
    status: status || 'active' 
  };
  
  warehouseModel.createWarehouse(warehouseData, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error inserting data' });
    }
    res.status(201).send({ 
      warehouse_id: result.insertId, 
      message: 'Warehouse created successfully' 
    });
  });
};

const getAllWarehouses = (req, res) => {
  warehouseModel.getAllWarehouses((err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error fetching data' });
    }
    res.status(200).send(results);
  });
};

module.exports = { createWarehouse, getAllWarehouses };