const db = require('../db');

const loginUser = (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM registration WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Error during login query:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length > 0) {
            res.status(200).json({ message: 'Login successful', user: results[0] });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    });
};

module.exports = { loginUser };
