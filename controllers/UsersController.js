const userModel = require('../models/UsersModel');

const createUser = (req, res) => {
    const { user_name, email, phone_number, role, password, retype_password } = req.body;

    console.log("Request Body:", req.body); // Log to check received data

    if (password !== retype_password) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    const userData = { user_name, email, phone_number, role, password };
    console.log("User Data to Insert:", userData); // Log to verify data sent to DB

    userModel.insertUser(userData, (err, result) => {
        if (err) {
            console.error('Error inserting user:', err.message);
            return res.status(500).json({ message: 'Error inserting user' });
        }
        res.status(201).json({ message: 'User created successfully', userId: result.insertId });
    });
};

const getUsers = (req, res) => {
    userModel.fetchUsers((err, results) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            return res.status(500).json({ message: 'Error fetching users' });
        }
        res.status(200).json(results);
    });
};

// Get a user by ID
const getUserById = (req, res) => {
    const { id } = req.params;
    userModel.fetchUserById(id, (err, result) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            return res.status(500).json({ message: 'Error fetching user' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(result[0]);
    });
};

// Update user
const updateUser = (req, res) => {
    const { id } = req.params;
    const { user_name, email, phone_number, role } = req.body;

    userModel.updateUser(id, { user_name, email, phone_number, role }, (err, result) => {
        if (err) {
            console.error('Error updating user:', err.message);
            return res.status(500).json({ message: 'Error updating user' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User updated successfully' });
    });
};

// Delete user
const deleteUser = (req, res) => {
    const { id } = req.params;

    userModel.deleteUser(id, (err, result) => {
        if (err) {
            console.error('Error deleting user:', err.message);
            return res.status(500).json({ message: 'Error deleting user' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    });
};

module.exports = {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
};