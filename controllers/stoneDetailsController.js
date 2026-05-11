const stoneDetailsModel = require('../models/stoneDetailsModel');

// Add a new product stone detail
const addProductStoneDetailsController = async (req, res) => {
    const { subproductname, weight, c_weight, ratepergram, amount, totalweight, totalprice, cut, color, clarity } = req.body;
  
    // Ensure all required fields are present
    if (!subproductname || !weight || !ratepergram || !amount || totalweight === null || totalprice === null) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      const result = await stoneDetailsModel.addProductStoneDetails(subproductname, weight, c_weight, ratepergram, amount, totalweight, totalprice, cut, color, clarity);
      res.status(200).json({ message: "Data inserted successfully", result });
    } catch (error) {
      console.error("Error inserting data:", error);
      res.status(500).json({ error: "Failed to insert data" });
    }
  };

// Fetch all product stone details
const getStoneDetails = (req, res) => {
    stoneDetailsModel.getStoneDetails((err, results) => {
        if (err) {
            console.error('Error fetching data:', err.message);
            return res.status(500).json({ error: 'Failed to fetch data' });
        }
        res.status(200).json({ products: results });
    });
};

// Update a product stone detail
const updateStoneDetail = (req, res) => {
    const { id } = req.params; // Get the product id from URL
    const { subproductname, weight, c_weight, amount, ratepergram, totalweight, totalprice, cut, color, clarity } = req.body;

    const data = [subproductname, weight, c_weight, amount, ratepergram, totalweight, totalprice, cut, color, clarity];

    stoneDetailsModel.updateStoneDetail(data, id, (err, result) => {
        if (err) {
            console.error('Error updating data:', err.message);
            return res.status(500).json({ error: 'Failed to update data' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json({ message: 'Product updated successfully' });
    });
};

// Delete a product stone detail
const deleteStoneDetail = (req, res) => {
    const { id } = req.params; // Get the product id from URL

    stoneDetailsModel.deleteStoneDetail(id, (err, result) => {
        if (err) {
            console.error('Error deleting data:', err.message);
            return res.status(500).json({ error: 'Failed to delete data' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    });
};

module.exports = {
    addProductStoneDetailsController,
    getStoneDetails,
    updateStoneDetail,
    deleteStoneDetail
};
