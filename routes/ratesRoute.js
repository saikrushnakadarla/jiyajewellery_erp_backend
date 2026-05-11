const express = require('express');
const ratesController = require('../controllers/ratesController');
const router = express.Router();

router.post('/post/rates', ratesController.addRates);
router.get("/get/current-rates", ratesController.fetchCurrentRates);
router.get("/get/rates", ratesController.fetchRates);

module.exports = router;
