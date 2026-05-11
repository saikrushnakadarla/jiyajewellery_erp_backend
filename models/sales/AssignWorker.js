const db = require('./../../db'); // Import MySQL connection instance

// In RepairModel.js
class RepairModel {
    static assignWorker(order_number, worker_name, account_id) {
      return new Promise((resolve, reject) => {
        const query = `
          UPDATE repair_details 
          SET worker_name = ?, assigning = 'assigned', account_id = ?
          WHERE order_number = ? 
        `;
        
        db.query(query, [worker_name, account_id, order_number], (err, result) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
    }
  }
  
  module.exports = RepairModel;
  

