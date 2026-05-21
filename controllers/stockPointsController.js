const stockPointsModel = require('../models/stockPointsModel');

const createStockPoint = (req, res) => {
  const { stock_point_name, location, warehouse_id, description, status } = req.body;
  
  // Validate required fields
  if (!stock_point_name || !location || !warehouse_id) {
    return res.status(400).send({ 
      message: 'Stock point name, location, and warehouse ID are required' 
    });
  }
  
  // Check for duplicate stock point name in same warehouse
  stockPointsModel.checkDuplicateStockPoint(stock_point_name, warehouse_id, null, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error checking duplicate' });
    }
    
    if (result[0].count > 0) {
      return res.status(400).send({ 
        message: 'Stock point with this name already exists in the selected warehouse' 
      });
    }
    
    const stockPointData = { stock_point_name, location, warehouse_id, description, status };
    
    stockPointsModel.createStockPoint(stockPointData, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: 'Error inserting data' });
      }
      res.status(201).send({ 
        id: result.insertId, 
        message: 'Stock point created successfully' 
      });
    });
  });
};

const getAllStockPoints = (req, res) => {
  stockPointsModel.getAllStockPoints((err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error fetching data' });
    }
    res.status(200).send(results);
  });
};

const getStockPointById = (req, res) => {
  const { id } = req.params;
  stockPointsModel.getStockPointById(id, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error fetching data' });
    }
    if (results.length === 0) {
      return res.status(404).send({ message: 'Stock point not found' });
    }
    res.status(200).send(results[0]);
  });
};

const getStockPointsByWarehouse = (req, res) => {
  stockPointsModel.getStockPointsByWarehouse((err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error fetching data' });
    }
    res.status(200).send(results);
  });
};

const updateStockPointById = (req, res) => {
  const { id } = req.params;
  const { stock_point_name, location, warehouse_id, description, status } = req.body;
  
  if (!stock_point_name || !location || !warehouse_id) {
    return res.status(400).send({ 
      message: 'Stock point name, location, and warehouse ID are required' 
    });
  }
  
  // Check for duplicate excluding current record
  stockPointsModel.checkDuplicateStockPoint(stock_point_name, warehouse_id, id, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error checking duplicate' });
    }
    
    if (result[0].count > 0) {
      return res.status(400).send({ 
        message: 'Stock point with this name already exists in the selected warehouse' 
      });
    }
    
    const stockPointData = { stock_point_name, location, warehouse_id, description, status };
    
    stockPointsModel.updateStockPointById(id, stockPointData, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: 'Error updating data' });
      }
      res.status(200).send({ message: 'Stock point updated successfully' });
    });
  });
};

const deleteStockPointById = (req, res) => {
  const { id } = req.params;
  stockPointsModel.deleteStockPointById(id, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error deleting data' });
    }
    res.status(200).send({ message: 'Stock point deleted successfully' });
  });
};

module.exports = { 
  createStockPoint, 
  getAllStockPoints, 
  getStockPointById,
  getStockPointsByWarehouse,
  updateStockPointById, 
  deleteStockPointById 
};