const User = require('../models/userModel');
const bcrypt = require('bcrypt');

const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email/Username and password are required' });
    return;
  }

  // First check in users table (admin users)
  User.findByEmail(email, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      
      // Compare plain text passwords directly
      if (password !== user.password) {
        res.status(401).json({ success: false, message: 'Invalid email/username or password' });
        return;
      }

      // Return admin user data
      res.json({
        success: true,
        role: user.role,
        userId: user.id,
        fullName: user.user_name || user.full_name || 'Admin',
        userType: 'admin'
      });
      return;
    }

    // If not found in users table, check stock_points table
    User.findByStockPointUserName(email, (err2, stockResults) => {
      if (err2) {
        console.error('Stock points database query error:', err2);
        res.status(500).json({ success: false, message: 'Internal server error' });
        return;
      }

      if (stockResults.length === 0) {
        res.status(401).json({ success: false, message: 'Invalid email/username or password' });
        return;
      }

      const stockUser = stockResults[0];
      
      console.log('Stock User Found:', {
        id: stockUser.stock_point_id,
        name: stockUser.stock_point_name,
        username: stockUser.user_name,
        status: stockUser.status
      });
      
      // Check if stock point is active
      if (stockUser.status !== 'active') {
        res.status(401).json({ success: false, message: 'Your stock point account is inactive. Please contact administrator.' });
        return;
      }

      // Compare password - stock_points table has hashed passwords
      bcrypt.compare(password, stockUser.password, (err3, isMatch) => {
        if (err3) {
          console.error('Password comparison error:', err3);
          res.status(500).json({ success: false, message: 'Internal server error' });
          return;
        }
        
        if (!isMatch) {
          res.status(401).json({ success: false, message: 'Invalid email/username or password' });
          return;
        }
        
        // Return stock point user data
        res.json({
          success: true,
          role: 'stock_point',
          userId: stockUser.stock_point_id,
          fullName: stockUser.stock_point_name, // This is the stock point name
          userType: 'stock_point',
          stockPointId: stockUser.stock_point_id,
          stockPointName: stockUser.stock_point_name,
          userName: stockUser.user_name // The email/username used for login
        });
      });
    });
  });
};

module.exports = { login };