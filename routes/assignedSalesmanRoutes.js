const express = require("express");
const router = express.Router();
const assignedSalesmanController = require("../controllers/assignedSalesman");

// Routes
router.post("/save-assigned-salesman", assignedSalesmanController.saveAssignedSalesman);
router.get("/get-assigned-transfers", assignedSalesmanController.getAllAssignedTransfers);
router.get("/get-assigned-transfer/:transfer_id", assignedSalesmanController.getAssignedTransferById);
router.put("/update-assigned-transfer/:transfer_id", assignedSalesmanController.updateAssignedTransfer);
router.delete("/delete-assigned-transfer/:transfer_id", assignedSalesmanController.deleteAssignedTransfer);
router.get("/lastAssignedNumber", assignedSalesmanController.getLastAssignedNumber);
router.get("/get-salesmen", assignedSalesmanController.getSalesmen);
router.put("/update-status/:transfer_id", assignedSalesmanController.updateStatus);
router.get("/get-assigned-products-by-salesman", assignedSalesmanController.getAssignedProductsBySalesman);


// NEW: Routes for salesman approval workflow
router.get("/get-pending-assignments", assignedSalesmanController.getPendingAssignments);
router.put("/update-salesman-status/:transfer_id", assignedSalesmanController.updateSalesmanStatus);

module.exports = router;