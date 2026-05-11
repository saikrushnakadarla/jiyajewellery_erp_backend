const db = require('../db');

const TaxSlabModel = {
    insertTaxSlab: (taxSlabData, callback) => {
        const query = `
            INSERT INTO taxslabs (TaxSlabID, TaxSlabName, TaxationType, SGSTPercentage, CGSTPercentage, IGSTPercentage, TaxCategory)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            taxSlabData.TaxSlabID,
            taxSlabData.TaxSlabName,
            taxSlabData.TaxationType,
            taxSlabData.SGSTPercentage,
            taxSlabData.CGSTPercentage,
            taxSlabData.IGSTPercentage,
            taxSlabData.TaxCategory,
        ];
        db.query(query, values, callback);
    },

    getAllTaxSlabs: (callback) => {
        const query = 'SELECT * FROM taxslabs';
        db.query(query, callback);
    },

    getTaxSlabById: (id, callback) => {
        const query = 'SELECT * FROM taxslabs WHERE TaxSlabID = ?';
        db.query(query, [id], callback);
    },
};

module.exports = TaxSlabModel;
