const express = require('express');
const router = express.Router();
const estimateController = require("../controllers/estimateController");


router.post("/add/estimate", estimateController.addEstimate);
router.get('/get/estimates', estimateController.getEstimates);
router.put('/edit/estimate/:id', estimateController.updateEstimate);
router.delete('/delete/estimate/:estimate_number', estimateController.deleteEstimate);

router.get("/lastEstimateNumber", estimateController.getLastEstimateNumber);
router.get("/get-unique-estimates", estimateController.getAllUniqueEstimates);
router.get("/get-estimates/:estimate_number", estimateController.getEstimateDetailsByEstimateNumber);

module.exports = router;