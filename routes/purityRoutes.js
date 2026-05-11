const express = require('express');
const router = express.Router();
const purityController = require('../controllers/purityController');

router.post('/purity', purityController.createPurity);
router.get('/purity', purityController.getAllPurities);
router.get('/purity/:id', purityController.getPurityById);
router.put('/purity/:id', purityController.updatePurityById);
router.delete('/purity/:id', purityController.deletePurityById);

module.exports = router;
