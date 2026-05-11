const TaxSlabModel = require('../models/taxSlabModel');

const TaxSlabController = {
    createTaxSlab: (req, res) => {
        const { TaxSlabID, TaxSlabName, TaxationType, SGSTPercentage, CGSTPercentage, IGSTPercentage, TaxCategory } = req.body;

        if (!TaxSlabID || !TaxSlabName || !TaxationType || SGSTPercentage === undefined || CGSTPercentage === undefined || IGSTPercentage === undefined || !TaxCategory) {
            return res.status(400).send('All fields are required.');
        }

        TaxSlabModel.insertTaxSlab(req.body, (err) => {
            if (err) {
                console.error('Error inserting data:', err.message);
                return res.status(500).send('Failed to add tax slab.');
            }
            res.status(201).send('Tax slab added successfully.');
        });
    },

    fetchAllTaxSlabs: (req, res) => {
        TaxSlabModel.getAllTaxSlabs((err, results) => {
            if (err) {
                console.error('Error fetching data:', err.message);
                return res.status(500).send('Failed to retrieve tax slabs.');
            }
            res.status(200).json(results);
        });
    },

    fetchTaxSlabById: (req, res) => {
        const { id } = req.params;

        TaxSlabModel.getTaxSlabById(id, (err, results) => {
            if (err) {
                console.error('Error fetching data:', err.message);
                return res.status(500).send('Failed to retrieve tax slab.');
            }

            if (results.length === 0) {
                return res.status(404).send('Tax slab not found.');
            }

            res.status(200).json(results[0]);
        });
    },
};

module.exports = TaxSlabController;
