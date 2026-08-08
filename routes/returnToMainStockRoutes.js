const express = require("express");
const router = express.Router();
const returnToMainStockController = require("../controllers/returnToMainStockController");

// Routes
router.post("/save-return-to-main-stock", returnToMainStockController.saveReturnToMainStock);
router.get("/get-return-transfers", returnToMainStockController.getAllReturnTransfers);
router.get("/get-return-transfer/:return_id", returnToMainStockController.getReturnTransferById);
router.put("/update-return-transfer/:return_id", returnToMainStockController.updateReturnTransfer);
router.delete("/delete-return-transfer/:return_id", returnToMainStockController.deleteReturnTransfer);
router.get("/lastReturnNumber", returnToMainStockController.getLastReturnNumber);
router.put("/update-status/:return_id", returnToMainStockController.updateStatus);

// Weight routes for items
router.put("/update-item-weight/:item_id", returnToMainStockController.updateItemWeight);
router.get("/get-item-weight/:item_id", returnToMainStockController.getItemWeight);
router.get("/get-items-weights/:return_id", returnToMainStockController.getItemsWithWeightsByReturn);

module.exports = router;