const db = require('../db');

const Receipt = {
    addReceipt: (data, callback) => {
        // Add console.log to check the incoming data
        console.log('Received data from frontend:', data);
        console.log('Mobile number received:', data.mobile); // Specific check for mobile number
    
        const query = `
            INSERT INTO receipts (date, mode, cheque_number, receipt_no, account_name, total_amt, discount_amt, cash_amt, remarks, mobile)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            data.date, data.mode, data.cheque_number, data.receipt_no, 
            data.account_name, data.total_amt, data.discount_amt, 
            data.cash_amt, data.remarks, data.mobile
        ];
        
        // Optional: Log the values being inserted
        console.log('Values being inserted:', values);
        
        db.query(query, values, callback);
    },
    getAllReceipts: (callback) => {
        const query = `SELECT * FROM receipts`;
        db.query(query, callback);
    },

    getReceiptById: (id, callback) => {
        const query = `SELECT * FROM receipts WHERE receipt_id = ?`;
        db.query(query, [id], callback);
    },

    updateReceipt: (id, data, callback) => {
        const query = `
            UPDATE receipts 
            SET date = ?, mode = ?, cheque_number = ?, receipt_no = ?, account_name = ?, total_amt = ?, 
                discount_amt = ?, cash_amt = ?, remarks = ?
            WHERE receipt_id = ?
        `;
        const values = [
            data.date, data.mode, data.cheque_number, data.receipt_no, 
            data.account_name, data.total_amt, data.discount_amt, 
            data.cash_amt, data.remarks, id
        ];
        db.query(query, values, callback);
    },

    deleteReceipt: (id, callback) => {
        const query = `DELETE FROM receipts WHERE receipt_id = ?`;
        db.query(query, [id], callback);
    }
};

module.exports = Receipt;
