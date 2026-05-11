const Offer = require('../models/OffersModel');

// Get all offers
exports.getOffers = (req, res) => {
  Offer.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
};

// Create a new offer
exports.createOffer = (req, res) => {
  const data = req.body;

  Offer.create(data, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Offer created or updated', offer_id: 1 });
  });
};


// Get single offer by ID
exports.getOfferById = (req, res) => {
    const id = req.params.id;
  
    Offer.getById(id, (err, results) => {
      if (err) return res.status(500).json({ error: err });
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'Offer not found' });
      }
  
      res.json(results[0]); // Return only the first row
    });
  };
  

// Update an offer
exports.updateOffer = (req, res) => {
    const id = req.params.id;
    const data = req.body;
  
    Offer.update(id, data, (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Offer updated' });
    });
  };

  // Update offer status
exports.updateOfferStatus = (req, res) => {
  const id = req.params.id;
  const { offer_status } = req.body;

  Offer.updateStatus(id, offer_status, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Offer status updated' });
  });
};
  
  // Delete an offer
  exports.deleteOffer = (req, res) => {
    const id = req.params.id;
  
    Offer.delete(id, (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Offer deleted' });
    });
  };