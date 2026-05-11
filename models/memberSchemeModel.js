const db = require("../db");

const insertMemberScheme = (data, callback) => {
    const query = `
        INSERT INTO member_schemes (
            scheme, member_name, member_number, scheme_name, 
            installments_paid, duration_months, paid_months, 
            pending_months, paid_amount, pending_amount, schemes_total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(
        query,
        [
            data.scheme,
            data.member_name,
            data.member_number,
            data.scheme_name,
            data.installments_paid || 0,
            data.duration_months || 0,
            data.paid_months || 0,
            data.pending_months || 0,
            data.paid_amount || 0.0,
            data.pending_amount || 0.0,
            data.schemes_total_amount || 0.0,
        ],
        callback
    );
};

// Function to fetch all records
const getAllMemberSchemes = (callback) => {
    const query = 'SELECT * FROM member_schemes';
    db.query(query, callback);
};

module.exports = {
    insertMemberScheme,
    getAllMemberSchemes,
};