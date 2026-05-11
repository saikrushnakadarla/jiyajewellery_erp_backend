const express = require("express");
const router = express.Router();
const SubcategoryController = require("../controllers/SubCategoryContoller");

// Route for creating a subcategory
router.post("/subcategory", SubcategoryController.createSubcategory);

// Route for fetching all subcategories
router.get("/subcategory", SubcategoryController.getSubcategories);
// Update a subcategory
router.put("/subcategory/:subcategory_id", SubcategoryController.updateSubcategory);
// Route to fetch a single subcategory by ID
router.get("/subcategory/:subcategory_id", SubcategoryController.getSubcategoryById);

// Delete a subcategory
router.delete("/subcategory/:subcategory_id", SubcategoryController.deleteSubcategory);

module.exports = router;
