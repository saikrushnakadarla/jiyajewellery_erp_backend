const Receipt = require('../models/receiptModel');

exports.addReceipt = (req, res) => {
    Receipt.addReceipt(req.body, (err, result) => {
        if (err) {
            console.error('Error adding receipt:', err.message);
            return res.status(500).json({ message: 'Error adding receipt' });
        }
        res.status(201).json({ message: 'Receipt added successfully', receipt_id: result.insertId });
    });
};

exports.getAllReceipts = (req, res) => {
    Receipt.getAllReceipts((err, results) => {
        if (err) {
            console.error('Error fetching receipts:', err.message);
            return res.status(500).json({ message: 'Error fetching receipts' });
        }
        res.status(200).json(results);
    });
};

exports.getReceiptById = (req, res) => {
    const { id } = req.params;
    Receipt.getReceiptById(id, (err, results) => {
        if (err) {
            console.error('Error fetching receipt:', err.message);
            return res.status(500).json({ message: 'Error fetching receipt' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        res.status(200).json(results[0]);
    });
};

exports.updateReceipt = (req, res) => {
    const { id } = req.params;
    Receipt.updateReceipt(id, req.body, (err, result) => {
        if (err) {
            console.error('Error updating receipt:', err.message);
            return res.status(500).json({ message: 'Error updating receipt' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        res.status(200).json({ message: 'Receipt updated successfully' });
    });
};

exports.deleteReceipt = (req, res) => {
    const { id } = req.params;
    Receipt.deleteReceipt(id, (err, result) => {
        if (err) {
            console.error('Error deleting receipt:', err.message);
            return res.status(500).json({ message: 'Error deleting receipt' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        res.status(200).json({ message: 'Receipt deleted successfully' });
    });
};
