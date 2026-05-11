const db = require('../db');

// Insert new account record
const createAccount = (data, callback) => {
    const sql = `INSERT INTO accounts (
        account_name, print_name, \`group\`, op_bal, dr_cr, metal_balance,
        address, address2, city, area, pincode, state, state_code,
        phone, mobile, contact_person, email, birthday_on, anniversary_on,
        branch, bank_account_no, bank_name, ifsc_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        data.account_name, data.print_name, data.group, data.op_bal, data.dr_cr, data.metal_balance,
        data.address, data.address2, data.city, data.area, data.pincode, data.state, data.state_code,
        data.phone, data.mobile, data.contact_person, data.email, data.birthday_on, data.anniversary_on,
        data.branch, data.bank_account_no, data.bank_name, data.ifsc_code
    ];

    db.query(sql, values, callback);
};

// Get all accounts
const getAllAccounts = (callback) => {
    const sql = 'SELECT * FROM accounts';
    db.query(sql, callback);
};

// Get account by ID
const getAccountById = (id, callback) => {
    const sql = 'SELECT * FROM accounts WHERE account_id = ?';
    db.query(sql, [id], callback);
};

// Update account by ID
const updateAccount = (id, data, callback) => {
    const sql = `UPDATE accounts SET 
        account_name = ?, print_name = ?, \`group\` = ?, op_bal = ?, dr_cr = ?, metal_balance = ?,
        address = ?, address2 = ?, city = ?, area = ?, pincode = ?, state = ?, state_code = ?,
        phone = ?, mobile = ?, contact_person = ?, email = ?, birthday_on = ?, anniversary_on = ?,
        branch = ?, bank_account_no = ?, bank_name = ?, ifsc_code = ?
    WHERE account_id = ?`;

    const values = [
        data.account_name, data.print_name, data.group, data.op_bal, data.dr_cr, data.metal_balance,
        data.address, data.address2, data.city, data.area, data.pincode, data.state, data.state_code,
        data.phone, data.mobile, data.contact_person, data.email, data.birthday_on, data.anniversary_on,
        data.branch, data.bank_account_no, data.bank_name, data.ifsc_code, id
    ];

    db.query(sql, values, callback);
};

// Delete account by ID
const deleteAccount = (id, callback) => {
    const sql = 'DELETE FROM accounts WHERE account_id = ?';
    db.query(sql, [id], callback);
};

module.exports = {
    createAccount,
    getAllAccounts,
    getAccountById,
    updateAccount,
    deleteAccount
};
