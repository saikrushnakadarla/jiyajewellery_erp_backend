const { updateRepairDetails, updateOpenTags,addAvailableEntry,updateProduct } = require('../models/saleReturnModel');

const handleUpdateRepairDetails = async (req, res) => {
  try {
    const { updates } = req.body;
    await updateRepairDetails(updates);
    res.status(200).json({ message: "Repair details updated successfully!" });
  } catch (error) {
    console.error("Error updating repair details:", error);
    res.status(500).json({ message: "Failed to update repair details." });
  }
};

const handleUpdateOpenTags = async (req, res) => {
  try {
    const { updates } = req.body;
    await updateOpenTags(updates);
    res.status(200).json({ message: "Open tags updated successfully!" });
  } catch (error) {
    console.error("Error updating open tags:", error);
    res.status(500).json({ message: "Failed to update open tags." });
  }
};

const handleAddAvailableEntry = async (req, res) => {
  try {
    const { codes } = req.body;
    await addAvailableEntry(codes);
    res.status(200).json({ message: "Entries with status 'Available' added successfully!" });
  } catch (error) {
    console.error("Error adding available entries:", error);
    res.status(500).json({ message: "Failed to add available entries." });
  }
};

const handleUpdateProduct = async (req, res) => {
  try {
    const { updates } = req.body;
    await updateProduct(updates);
    res.status(200).json({ message: "Product updated successfully!" });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Failed to update product." });
  }
};

module.exports = { handleUpdateRepairDetails, handleUpdateOpenTags, handleAddAvailableEntry,handleUpdateProduct};
