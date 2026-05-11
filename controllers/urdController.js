const { insertUrdPurchaseDetail,getAllPurchases, updateUrdPurchase, 
  deleteUrdPurchaseDetail  } = require('../models/urdModel');

const saveUrdPurchase = (req, res) => {

  const { customerDetails, items } = req.body;
  if (!customerDetails || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid input: Missing customer details or items.' });
  }

  let hasError = false;

  // Process each item
  items.forEach((item, index) => {
    insertUrdPurchaseDetail(customerDetails, item, (err) => {
      if (err) {
        console.error(`Error inserting item data for item at index ${index}:`, err.message);
        hasError = true;
      }
    });
  });

  if (hasError) {
    return res.status(500).json({ error: 'Failed to save some or all purchase data' });
  }

  res.status(200).json({ message: 'Purchase saved successfully' });
};

const getUrdPurchases = (req, res) => {
  getAllPurchases((err, results) => {
    if (err) {
      console.error("Error fetching URD purchases:", err.message);
      return res.status(500).json({ error: "Failed to fetch URD purchases." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No URD purchases found." });
    }

    res.status(200).json(results);
  });
};

  const getLastURDPurchaseNumber = (req, res) => {
    getAllPurchases((err, result) => {
      if (err) {
        console.error("Error fetching last purchase number:", err);
        return res.status(500).json({ error: "Failed to fetch last purchase number" });
      }
  
      if (result.length > 0) {
        // Process purchase numbers to find the next one
        const URDNumbers = result
          .map(row => row.urdpurchase_number)
          .filter(purchase => purchase.startsWith("URD"))
          .map(purchase => parseInt(purchase.slice(3), 10)); // Extract numeric part
  
        const lastURDPurchaseNumber = Math.max(...URDNumbers);
        const nextURDPurchaseNumber = `URD${String(lastURDPurchaseNumber + 1).padStart(3, "0")}`;
  
        res.json({ lastURDPurchaseNumber: nextURDPurchaseNumber });
      } else {
        res.json({ lastURDPurchaseNumber: "URD001" }); // Start with URD001
      }
    });
  };

  // Controller for updating URD purchase details
  const updateUrdPurchaseDetails = (req, res) => {
    const urdPurchaseNumber = req.params.urdPurchaseNumber; // Extract purchase number from URL
  
    // Log the request body for debugging
    console.log("Request Body:", req.body);
  
    // Check if request body exists
    if (!req.body) {
      return res.status(400).json({ message: "Request body is required" });
    }
  
    // Call the model function to update URD purchase details
    updateUrdPurchase(urdPurchaseNumber, req.body, (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        return res
          .status(500)
          .json({ message: "Database error occurred", error: err });
      }
  
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Purchase record not found for update" });
      }
  
      res.status(200).json({ message: "Item updated successfully", result });
    });
  };
// Delete URD purchase details
const deleteUrdPurchase = (req, res) => {
  const { urdpurchase_number } = req.params;

  if (!urdpurchase_number) {
    return res.status(400).json({ error: 'Invalid input: Missing URD purchase number.' });
  }

  deleteUrdPurchaseDetail(urdpurchase_number, (err, result) => {
    if (err) {
      console.error("Error deleting URD purchase:", err.message);
      return res.status(500).json({ error: 'Failed to delete URD purchase.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'URD purchase not found.' });
    }

    res.status(200).json({ message: 'URD purchase deleted successfully.' });
  });
};

module.exports = { saveUrdPurchase,getUrdPurchases,getLastURDPurchaseNumber,updateUrdPurchaseDetails, deleteUrdPurchase };
