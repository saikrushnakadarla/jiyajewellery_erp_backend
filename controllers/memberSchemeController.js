const memberSchemeModel = require('../models/memberSchemeModel');

// Controller for adding a member scheme
const addMemberScheme = (req, res) => {
    const data = req.body;

    memberSchemeModel.insertMemberScheme(data, (err, result) => {
        if (err) {
            console.error('Error inserting record:', err);
            res.status(500).send('Failed to add the record.');
        } else {
            res.status(201).send({ message: 'Record added successfully!', id: result.insertId });
        }
    });
};

// Controller for fetching all member schemes
const getAllMemberSchemes = (req, res) => {
    memberSchemeModel.getAllMemberSchemes((err, results) => {
        if (err) {
            console.error('Error fetching records:', err);
            res.status(500).send('Failed to fetch records.');
        } else {
            res.status(200).json(results);
        }
    });
};

module.exports = {
    addMemberScheme,
    getAllMemberSchemes,
};
