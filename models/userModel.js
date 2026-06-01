const db = require('../db');

const User = {
  findByEmail: (email, callback) => {
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], callback);
  },

  findByStockPointUserName: (userName, callback) => {
    const query = 'SELECT * FROM stock_points WHERE user_name = ?';
    db.query(query, [userName], callback);
  }
};

module.exports = User;
