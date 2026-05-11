// controllers/accountController.js
const accountModel = require('../models/accountModel');

// Create a new account
const createAccount = (req, res) => {
    const data = req.body;
    accountModel.createAccount(data, (err, result) => {
        if (err) {
            console.error('Error inserting into accounts:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Account created successfully', account_id: result.insertId });
    });
};

// Get all accounts
const getAllAccounts = (req, res) => {
    accountModel.getAllAccounts((err, results) => {
        if (err) {
            console.error('Error fetching accounts:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json(results);
    });
};

// Get account by ID
const getAccountById = (req, res) => {
    const { id } = req.params;
    accountModel.getAccountById(id, (err, result) => {
        if (err) {
            console.error('Error fetching account by ID:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.status(200).json(result[0]);
    });
};

// Update account by ID
const updateAccount = (req, res) => {
    const { id } = req.params;
    const data = req.body;
    accountModel.updateAccount(id, data, (err, result) => {
        if (err) {
            console.error('Error updating account:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.status(200).json({ message: 'Account updated successfully' });
    });
};

// Delete account by ID
const deleteAccount = (req, res) => {
    const { id } = req.params;
    accountModel.deleteAccount(id, (err, result) => {
        if (err) {
            console.error('Error deleting account:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.status(200).json({ message: 'Account deleted successfully' });
    });
};

module.exports = {
    createAccount,
    getAllAccounts,
    getAccountById,
    updateAccount,
    deleteAccount
};
