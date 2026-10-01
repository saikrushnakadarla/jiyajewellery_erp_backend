const stockPointsModel = require('../models/stockPointsModel');
const bcrypt = require('bcrypt');

const saltRounds = 10;
const USER_ID_STEP = 1; // existing data uses 2, 3 ... so step is 1. Change here if you need +2.

const createStockPoint = (req, res) => {
  const { stock_point_name, location, warehouse_id, description, user_name, password, status, default_status, salesman_ids } = req.body;
  
  if (!stock_point_name || !location || !warehouse_id) {
    return res.status(400).send({ 
      message: 'Stock point name, location, and warehouse ID are required' 
    });
  }
  
  stockPointsModel.checkDuplicateStockPoint(stock_point_name, warehouse_id, null, async (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error checking duplicate' });
    }
    
    if (result[0].count > 0) {
      return res.status(400).send({ 
        message: 'Stock point with this name already exists in the selected warehouse' 
      });
    }
    
    // Get next user_id
    stockPointsModel.getNextUserId(async (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: 'Error generating user ID' });
      }

      // getNextUserId returns rows like [{ max_user_id: 3 }] -> read the number out of it
      const maxUserId = Array.isArray(rows) ? rows[0]?.max_user_id : rows;
      const nextUserId = (Number(maxUserId) || 1) + USER_ID_STEP;
      
      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        try {
          hashedPassword = await bcrypt.hash(password, saltRounds);
        } catch (hashErr) {
          console.error('Error hashing password:', hashErr);
          return res.status(500).send({ message: 'Error processing password' });
        }
      }
      
      const stockPointData = { 
        stock_point_name, 
        location, 
        warehouse_id, 
        description, 
        user_id: nextUserId,  // Add the auto-generated user_id
        user_name,
        password: hashedPassword,
        status,
        default_status: default_status || 'not_applied'
      };
      
      stockPointsModel.createStockPoint(stockPointData, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send({ message: 'Error inserting data' });
        }

        // Save the selected salesmen for this new stock point
        stockPointsModel.setSalesmen(result.insertId, salesman_ids, (sErr) => {
          if (sErr) {
            console.error(sErr);
            return res.status(500).send({ message: 'Stock point saved, but error saving salesmen' });
          }
          res.status(201).send({ 
            id: result.insertId, 
            user_id: nextUserId,
            message: 'Stock point created successfully' 
          });
        });
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
    // Don't send actual passwords in response (salesman_ids is included via ...item)
    const sanitizedResults = results.map(item => ({
      ...item,
      password: item.password ? '***HIDDEN***' : null
    }));
    res.status(200).send(sanitizedResults);
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
    // Don't send actual password
    const sanitizedResult = {
      ...results[0],
      password: undefined
    };
    res.status(200).send(sanitizedResult);
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

const getSalesmenByStockPointId = (req, res) => {
  const { id } = req.params;
  stockPointsModel.getSalesmenByStockPointId(id, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error fetching salesmen' });
    }
    res.status(200).send(results.map((r) => r.account_id));
  });
};

const updateStockPointById = (req, res) => {
  const { id } = req.params;
  const { stock_point_name, location, warehouse_id, description, user_name, password, status, default_status, salesman_ids } = req.body;
  
  if (!stock_point_name || !location || !warehouse_id) {
    return res.status(400).send({ 
      message: 'Stock point name, location, and warehouse ID are required' 
    });
  }
  
  stockPointsModel.checkDuplicateStockPoint(stock_point_name, warehouse_id, id, async (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error checking duplicate' });
    }
    
    if (result[0].count > 0) {
      return res.status(400).send({ 
        message: 'Stock point with this name already exists in the selected warehouse' 
      });
    }
    
    // First get existing user_id
    stockPointsModel.getStockPointById(id, async (err, existingData) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: 'Error fetching existing data' });
      }
      
      // Hash password if provided and not empty
      let hashedPassword = null;
      if (password && password.trim() !== '') {
        try {
          hashedPassword = await bcrypt.hash(password, saltRounds);
        } catch (hashErr) {
          console.error('Error hashing password:', hashErr);
          return res.status(500).send({ message: 'Error processing password' });
        }
      }
      
      const stockPointData = { 
        stock_point_name, 
        location, 
        warehouse_id, 
        description, 
        user_id: existingData[0]?.user_id || null,  // Keep existing user_id
        user_name,
        password: hashedPassword,
        status,
        default_status
      };
      
      stockPointsModel.updateStockPointById(id, stockPointData, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send({ message: 'Error updating data' });
        }

        // Replace salesmen with the edited selection
        stockPointsModel.setSalesmen(id, salesman_ids, (sErr) => {
          if (sErr) {
            console.error(sErr);
            return res.status(500).send({ message: 'Stock point updated, but error saving salesmen' });
          }
          res.status(200).send({ message: 'Stock point updated successfully' });
        });
      });
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

const updateDefaultStockPoint = (req, res) => {
  const { id } = req.params;
  
  stockPointsModel.resetAllDefaultStatus((err, resetResult) => {
    if (err) {
      console.error(err);
      return res.status(500).send({ message: 'Error resetting default status' });
    }
    
    stockPointsModel.setDefaultStockPoint(id, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: 'Error setting default stock point' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).send({ message: 'Stock point not found' });
      }
      
      res.status(200).send({ 
        message: 'Default stock point updated successfully',
        stock_point_id: id,
        default_status: 'applied'
      });
    });
  });
};

module.exports = { 
  createStockPoint, 
  getAllStockPoints, 
  getStockPointById,
  getStockPointsByWarehouse,
  getSalesmenByStockPointId,
  updateStockPointById, 
  deleteStockPointById,
  updateDefaultStockPoint
};