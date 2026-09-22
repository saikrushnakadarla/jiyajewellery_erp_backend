const express = require("express");
const router = express.Router();
const RateCutsController = require("../controllers/rateCutsController");

router.get("/rateCuts", RateCutsController.getAllRateCuts);
router.get("/rateCuts/:id", RateCutsController.getRateCutById);
router.post("/ratecuts", RateCutsController.addRateCut);
router.get("/purchase-balance/:purchase_id", RateCutsController.getPurchaseBalance);

module.exports = router;