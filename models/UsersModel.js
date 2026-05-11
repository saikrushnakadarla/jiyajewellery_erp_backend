const db = require('../db');

const insertUser = (data, callback) => {
    const query = `
        INSERT INTO users (user_name, email, phone_number, role, password, retype_password)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [data.user_name, data.email, data.phone_number, data.role, data.password, data.retype_password];
    db.query(query, values, callback);
};

const fetchUsers = (callback) => {
    const query = 'SELECT * FROM users';
    db.query(query, callback);
};

// Fetch a single user by ID
const fetchUserById = (id, callback) => {
    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [id], callback);
};


const updateUser = (id, data, callback) => {
    const query = `
        UPDATE users
        SET user_name = ?, email = ?, phone_number = ?, role = ?
        WHERE id = ?
    `;
    const values = [data.user_name, data.email, data.phone_number, data.role, id];
    db.query(query, values, callback);
};

const deleteUser = (id, callback) => {
    const query = 'DELETE FROM users WHERE id = ?';
    db.query(query, [id], callback);
};

module.exports = {
    insertUser,
    fetchUsers,
    fetchUserById,
    updateUser,
    deleteUser,
};