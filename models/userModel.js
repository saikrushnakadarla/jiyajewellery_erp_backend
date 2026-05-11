const db = require('../db');

const User = {
  findByEmail: (email, callback) => {
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], callback);
  },
};

module.exports = User;
