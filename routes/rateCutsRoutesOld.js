const express = require("express");
const router = express.Router();
const RateCutsController = require("../controllers/rateCutsController");

router.get("/rateCuts", RateCutsController.getAllRateCuts);
router.get("/rateCuts/:id", RateCutsController.getRateCutById);

router.post("/ratecuts", RateCutsController.addRateCut);
module.exports = router;
