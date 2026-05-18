const express = require("express");
const router = express.Router();
const SalesRateCutsController = require("../controllers/salesRateCutsController");

router.get("/sales/rateCuts", SalesRateCutsController.getAllSalesRateCuts);
router.get("/sales/rateCuts/:id", SalesRateCutsController.getSalesRateCutById);
router.get("/sales/rateCuts/by-repair/:repairId", SalesRateCutsController.getSalesRateCutsByRepairId);
router.post("/sales/ratecuts", SalesRateCutsController.addSalesRateCut);

module.exports = router;