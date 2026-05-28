const express = require("express");
const router = express.Router();
const stockTransferController = require("../controllers/stockTransfer/stockTransfer");

// Routes
router.post("/save-stock-transfer", stockTransferController.saveStockTransfer);
router.get("/get-stock-transfers", stockTransferController.getAllStockTransfers);
router.get("/get-stock-transfer/:transfer_id", stockTransferController.getStockTransferById);
router.put("/update-stock-transfer/:transfer_id", stockTransferController.updateStockTransfer);
router.delete("/delete-stock-transfer/:transfer_id", stockTransferController.deleteStockTransfer);

module.exports = router;