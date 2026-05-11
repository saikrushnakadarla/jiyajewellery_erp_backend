const User = require('../models/userModel'); // Import User directly

const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }

  User.findByEmail(email, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
      return;
    }

    if (results.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const user = results[0];

    // Compare plain text passwords directly (this is insecure; use bcrypt or similar for production)
    if (password !== user.password) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    res.json({
      success: true,
      role: user.role,
      userId: user.id,
      fullName: user.user_name, // Ensure column matches DB structure
    });
  });
};

module.exports = { login };
