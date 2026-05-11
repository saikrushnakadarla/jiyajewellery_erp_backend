const db = require('../db');

const Offer = {
  getAll: (callback) => {
    db.query('SELECT * FROM offerstable', callback);
  },

  getById: (id, callback) => {
    const sql = 'SELECT * FROM offerstable WHERE offer_id = ?';
    db.query(sql, [id], callback);
  },

  create: (data, callback) => {
    const sql = `REPLACE INTO offerstable (offer_id, offer_name, discount_on, discount_on_rate, discount_percentage, discount_percent_fixed, valid_from, valid_to, offer_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [
      1, // Always use offer_id = 1
      data.offer_name,
      data.discount_on,
      data.discount_on_rate,
      data.discount_percentage,
      data.discount_percent_fixed,
      data.valid_from,
      data.valid_to,
      "Applied",
    ];
    db.query(sql, values, callback);
  },
  

  update: (id, data, callback) => {
    const sql = `
      UPDATE offerstable
      SET offer_name = ?, discount_on = ?,  discount_on_rate = ?, discount_percentage = ?, discount_percent_fixed = ?,
       valid_from = ?, valid_to = ?, offer_status = ?
      WHERE offer_id = ?
    `;
    const values = [
      data.offer_name,
      data.discount_on,
      data.discount_on_rate,
      data.discount_percentage,
      data.discount_percent_fixed,
      data.valid_from,
      data.valid_to,
      'Applied',
      id
    ];
    db.query(sql, values, callback);
  },

  updateStatus: (id, offer_status, callback) => {
    const sql = `
      UPDATE offerstable
      SET offer_status = ?
      WHERE offer_id = ?
    `;
    db.query(sql, [offer_status, id], callback);
  },

  delete: (id, callback) => {
    db.query('DELETE FROM offerstable WHERE offer_id = ?', [id], callback);
  }
};

module.exports = Offer;
