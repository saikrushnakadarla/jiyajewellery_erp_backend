const SubcategoryModel = require("../models/SubCategoryModel");

const createSubcategory = (req, res) => {
  const formData = req.body;
  SubcategoryModel.createSubcategory(formData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error creating subcategory", details: err.message });
    }
    res.status(201).json({ message: "Subcategory created successfully", data: result });
  });
};

const getSubcategories = (req, res) => {
  SubcategoryModel.fetchSubcategories((err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching subcategories", details: err.message });
    }
    res.status(200).json({ data: results });
  });
};

const updateSubcategory = (req, res) => {
  const { subcategory_id } = req.params;
  const formData = req.body;
  SubcategoryModel.updateSubcategory(subcategory_id, formData, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error updating subcategory", details: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    res.status(200).json({ message: "Subcategory updated successfully" });
  });
};

const deleteSubcategory = (req, res) => {
  const { subcategory_id } = req.params;
  SubcategoryModel.deleteSubcategory(subcategory_id, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error deleting subcategory", details: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    res.status(200).json({ message: "Subcategory deleted successfully" });
  });
};

const getSubcategoryById = (req, res) => {
  const { subcategory_id } = req.params;

  SubcategoryModel.fetchSubcategoryById(subcategory_id, (err, result) => {
    if (err) {
      console.error("Error fetching subcategory:", err.message);
      return res.status(500).json({ error: "Failed to fetch subcategory", details: err.message });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    res.status(200).json(result[0]); // Send the first matching subcategory
  });
};

module.exports = {
  createSubcategory,
  getSubcategories,
  getSubcategoryById, // Add this
  updateSubcategory,
  deleteSubcategory,
};