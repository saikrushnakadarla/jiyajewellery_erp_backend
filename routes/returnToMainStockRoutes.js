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

// NEW: Routes for barcode status and packet barcode queries
router.get("/get-items-by-barcode-status/:status", returnToMainStockController.getItemsByBarcodeStatus);
router.get("/get-items-with-packet-barcode/:packet_barcode", returnToMainStockController.getItemsWithPacketBarcode);


// ============================================
// NEW: PACKET BARCODE ROUTES FOR RETURN TO MAIN STOCK
// ============================================

// Search packet by barcode/qr_code
router.get("/api/qr-packets/search/:qrCode", returnToMainStockController.searchPacketByQRCode);

// Create new packet
router.post("/api/qr-packets/create", returnToMainStockController.createPacket);

// Update packet status
router.put("/api/qr-packets/update-status/:id", returnToMainStockController.updatePacketStatus);

// Get all packets
router.get("/api/qr-packets/all", returnToMainStockController.getAllPackets);

module.exports = router;