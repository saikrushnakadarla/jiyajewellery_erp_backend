const express = require("express");
const router = express.Router();
const receivedSalesmanController = require("../controllers/receivedSalesmanController");

// Routes
router.post("/save-received-salesman", receivedSalesmanController.saveReceivedSalesman);
router.get("/get-received-transfers", receivedSalesmanController.getAllReceivedTransfers);
router.get("/get-received-transfer/:transfer_id", receivedSalesmanController.getReceivedTransferById);
router.put("/update-received-transfer/:transfer_id", receivedSalesmanController.updateReceivedTransfer);
router.delete("/delete-received-transfer/:transfer_id", receivedSalesmanController.deleteReceivedTransfer);
router.get("/lastReceivedNumber", receivedSalesmanController.getLastReceivedNumber);
router.get("/get-salesmen", receivedSalesmanController.getSalesmen);
router.put("/update-status/:transfer_id", receivedSalesmanController.updateStatus);
router.get("/get-assigned-products-by-salesman", receivedSalesmanController.getAssignedProductsBySalesman);

module.exports = router;