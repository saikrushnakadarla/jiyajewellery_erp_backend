const express = require("express");
const router = express.Router();
const SalesRateCutsController = require("../controllers/salesRateCutsController");

router.get("/sales-rateCuts", SalesRateCutsController.getAllSalesRateCuts);
router.get("/sales-rateCuts/:id", SalesRateCutsController.getSalesRateCutById);
router.post("/sales-ratecuts", SalesRateCutsController.addSalesRateCut);
router.get("/sales-balance/:sales_id", SalesRateCutsController.getSalesBalance);

module.exports = router;