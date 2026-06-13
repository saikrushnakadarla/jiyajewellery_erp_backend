// controllers/accountController.js
const accountModel = require('../models/accountModel');

// Create a new account
const createAccount = async (req, res) => {
    const data = req.body;
    const files = req.files;
    
    try {
        const result = await accountModel.createAccount(data, files);
        res.status(201).json({ 
            message: 'Account created successfully', 
            account_id: result.insertId,
            customer_id: result.customer_id,
            user_id: data.user_id
        });
    } catch (err) {
        console.error('Error inserting into account_details:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
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
    const files = req.files;
    const imagesToKeep = req.body.imagesToKeep;
    
    accountModel.updateAccount(id, data, files, imagesToKeep, (err, result) => {
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

// Salesman Login Controller
const salesmanLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        accountModel.getSalesmanByEmail(email, (err, results) => {
            if (err) {
                console.error('Salesman login error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }

            if (results.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }

            const salesman = results[0];

            if (password !== salesman.password) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }

            const user = {
                id: salesman.account_id,
                full_name: salesman.account_name,
                email_id: salesman.email,
                phone: salesman.mobile || salesman.phone,
                role: salesman.account_group.toLowerCase(),
                status: 'approved',
                account_status: salesman.account_status || 'active',
                email_verified: 'Verified',
                duty_start_time: salesman.duty_start_time,
                duty_end_time: salesman.duty_end_time
            };

            res.json({
                success: true,
                message: 'Login successful',
                user: user
            });
        });

    } catch (error) {
        console.error('Salesman login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// NEW: Check duty hours for salesman by account ID
const checkDutyHours = (req, res) => {
    const { accountId } = req.params;
    
    if (!accountId) {
        return res.status(400).json({ message: 'Account ID is required' });
    }
    
    accountModel.checkDutyHoursByAccountId(accountId, (err, results) => {
        if (err) {
            console.error('Error checking duty hours:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Salesman not found' });
        }
        
        const salesman = results[0];
        
        res.json({
            id: salesman.id,
            role: salesman.role,
            duty_start_time: salesman.duty_start_time,
            duty_end_time: salesman.duty_end_time,
            full_name: salesman.full_name,
            email_id: salesman.email
        });
    });
};

module.exports = {
    createAccount,
    getAllAccounts,
    getAccountById,
    updateAccount,
    deleteAccount,
    salesmanLogin,
    checkDutyHours  // Export new function
};