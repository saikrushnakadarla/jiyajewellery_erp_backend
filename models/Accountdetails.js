// const db = require('../db');

// // Function to insert data
// const insertAccountDetails = (data, callback) => {
//     const sql = `
//         INSERT INTO account_details (
//             account_name, print_name, account_group, op_bal, metal_balance, dr_cr, 
//             address1, address2, city, pincode, state, state_code, phone, mobile, contact_person, 
//             email, birthday, anniversary, bank_account_no, bank_name, ifsc_code, branch, 
//             gst_in, aadhar_card, pan_card, religion
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     // Convert empty strings to NULL
//     const formatValue = (value) => (value === '' ? null : value);

//     db.query(sql, [
//         data.account_name, data.print_name, data.account_group, data.op_bal, data.metal_balance, data.dr_cr,
//         data.address1, data.address2, data.city, data.pincode, data.state, data.state_code, 
//         data.phone, data.mobile, data.contact_person, data.email, 
//         formatValue(data.birthday), formatValue(data.anniversary), // Fix date fields
//         data.bank_account_no, data.bank_name, data.ifsc_code, data.branch, 
//         data.gst_in, data.aadhar_card, data.pan_card, data.religion
//     ], callback);
// };


// // Function to get all account details
// const getAllAccountDetails = (callback) => {
//     const sql = 'SELECT * FROM account_details';
//     db.query(sql, callback);
// };

// // Function to get account details by ID
// const getAccountDetailsById = (account_id, callback) => {
//     const sql = 'SELECT * FROM account_details WHERE account_id = ?';
//     db.query(sql, [account_id], callback);
// };

// // Function to update account details
// const updateAccountDetails = (account_id, data, callback) => {
//     const sql = `
//         UPDATE account_details
//         SET account_name = ?, print_name = ?, account_group = ?, op_bal = ?, metal_balance = ?, dr_cr = ?, 
//             address1 = ?, address2 = ?, city = ?, pincode = ?, state = ?, state_code = ?, 
//             phone = ?, mobile = ?, contact_person = ?, email = ?, birthday = ?, anniversary = ?, 
//             bank_account_no = ?, bank_name = ?, ifsc_code = ?, branch = ?, 
//             gst_in = ?, aadhar_card = ?, pan_card = ?, religion = ?
//         WHERE account_id = ?`;

//         const formatValue = (value) => (value === '' ? null : value);

//     db.query(sql, [
//         data.account_name, data.print_name, data.account_group, data.op_bal, data.metal_balance, data.dr_cr,
//         data.address1, data.address2, data.city, data.pincode, data.state, data.state_code, 
//         data.phone, data.mobile, data.contact_person, data.email, formatValue(data.birthday), formatValue(data.anniversary), 
//         data.bank_account_no, data.bank_name, data.ifsc_code, data.branch, 
//         data.gst_in, data.aadhar_card, data.pan_card, data.religion, account_id
//     ], callback);
// };

// // Function to delete account details
// const deleteAccountDetails = (account_id, callback) => {
//     const sql = 'DELETE FROM account_details WHERE account_id = ?';
//     db.query(sql, [account_id], callback);
// };

// module.exports = {
//     insertAccountDetails,
//     getAllAccountDetails,
//     getAccountDetailsById,
//     updateAccountDetails,
//     deleteAccountDetails
// };


const db = require('../db');

// Function to insert data
const insertAccountDetails = (data, callback) => {
    const sql = `
        INSERT INTO account_details (
            account_name, print_name, account_group, op_bal, metal_balance, dr_cr, 
            address1, address2, city, pincode, state, state_code, phone, mobile, contact_person, 
            email, birthday, anniversary, bank_account_no, bank_name, ifsc_code, branch, 
            gst_in, aadhar_card, pan_card, religion, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Convert empty strings to NULL
    const formatValue = (value) => (value === '' ? null : value);

    db.query(sql, [
        data.account_name, data.print_name, data.account_group, data.op_bal, data.metal_balance, data.dr_cr,
        data.address1, data.address2, data.city, data.pincode, data.state, data.state_code, 
        data.phone, data.mobile, data.contact_person, data.email, 
        formatValue(data.birthday), formatValue(data.anniversary),
        data.bank_account_no, data.bank_name, data.ifsc_code, data.branch, 
        data.gst_in, data.aadhar_card, data.pan_card, data.religion,
        data.images || null
    ], callback);
};

// Function to get all account details
const getAllAccountDetails = (callback) => {
    const sql = 'SELECT * FROM account_details';
    db.query(sql, callback);
};

// Function to get account details by ID
const getAccountDetailsById = (account_id, callback) => {
    const sql = 'SELECT * FROM account_details WHERE account_id = ?';
    db.query(sql, [account_id], callback);
};

// Function to update account details
const updateAccountDetails = (account_id, data, callback) => {
    const sql = `
        UPDATE account_details
        SET account_name = ?, print_name = ?, account_group = ?, op_bal = ?, metal_balance = ?, dr_cr = ?, 
            address1 = ?, address2 = ?, city = ?, pincode = ?, state = ?, state_code = ?, 
            phone = ?, mobile = ?, contact_person = ?, email = ?, birthday = ?, anniversary = ?, 
            bank_account_no = ?, bank_name = ?, ifsc_code = ?, branch = ?, 
            gst_in = ?, aadhar_card = ?, pan_card = ?, religion = ?, images = ?
        WHERE account_id = ?`;

    const formatValue = (value) => (value === '' ? null : value);

    db.query(sql, [
        data.account_name, data.print_name, data.account_group, data.op_bal, data.metal_balance, data.dr_cr,
        data.address1, data.address2, data.city, data.pincode, data.state, data.state_code, 
        data.phone, data.mobile, data.contact_person, data.email, 
        formatValue(data.birthday), formatValue(data.anniversary), 
        data.bank_account_no, data.bank_name, data.ifsc_code, data.branch, 
        data.gst_in, data.aadhar_card, data.pan_card, data.religion,
        data.images || null,
        account_id
    ], callback);
};

// Function to delete account details
const deleteAccountDetails = (account_id, callback) => {
    const sql = 'DELETE FROM account_details WHERE account_id = ?';
    db.query(sql, [account_id], callback);
};

module.exports = {
    insertAccountDetails,
    getAllAccountDetails,
    getAccountDetailsById,
    updateAccountDetails,
    deleteAccountDetails
};