const express = require('express');
const router = express.Router();
const offerController = require('../controllers/OffersControllers');

router.get('/offers', offerController.getOffers);
router.post('/offers', offerController.createOffer);
router.get('/offers/:id', offerController.getOfferById); // GET single offer
router.put('/offers/:id', offerController.updateOffer); // UPDATE
router.put('/offers/:id/status', offerController.updateOfferStatus); // New route for status update
router.delete('/offers/:id', offerController.deleteOffer); // DELETE

module.exports = router;
