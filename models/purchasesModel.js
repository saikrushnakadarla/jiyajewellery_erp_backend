const db = require('../db');

const executeUpdateQuery = (query, values) => {
    return new Promise((resolve, reject) => {
      db.getConnection((err, connection) => {
        if (err) {
          reject(err);
          return;
        }
  
        connection.query(query, values, (queryErr, result) => {
          if (queryErr) {
            connection.release();
            reject(queryErr);
            return;
          }
          connection.release();
          resolve(result);
        });
      });
    });
  };

const getAllPurchases = (callback) => {
    const query = 'SELECT * FROM purchases';
    db.query(query, callback);
};

// const executeDeleteAndUpdateQuery = (deleteQuery, deleteValues, updateQuery, updateValues) => {
//   return new Promise((resolve, reject) => {
//     db.getConnection((err, connection) => {
//       if (err) {
//         reject(err);
//         return;
//       }

//       connection.beginTransaction((transactionErr) => {
//         if (transactionErr) {
//           connection.release();
//           reject(transactionErr);
//           return;
//         }

//         // Execute the UPDATE query
//         connection.query(updateQuery, updateValues, (updateErr, updateResult) => {
//           if (updateErr) {
//             connection.rollback(() => {
//               connection.release();
//             });
//             reject(updateErr);
//             return;
//           }

//           // Execute the DELETE query
//           connection.query(deleteQuery, deleteValues, (deleteErr, deleteResult) => {
//             if (deleteErr) {
//               connection.rollback(() => {
//                 connection.release();
//               });
//               reject(deleteErr);
//               return;
//             }

//             // Commit the transaction
//             connection.commit((commitErr) => {
//               if (commitErr) {
//                 connection.rollback(() => {
//                   connection.release();
//                 });
//                 reject(commitErr);
//                 return;
//               }

//               connection.release();
//               resolve({ deleteResult, updateResult });
//             });
//           });
//         });
//       });
//     });
//   });
// };

const getLastRbarcode = (callback) => {
    const query = "SELECT rbarcode FROM purchases WHERE rbarcode LIKE 'RB%' ORDER BY id DESC LIMIT 1";
    db.query(query, callback);
};

const getLastInvoiceNumber = (callback) => {
    const query = "SELECT invoice FROM purchases WHERE invoice LIKE 'PNV%' ORDER BY id DESC LIMIT 1";
    db.query(query, callback);
};

module.exports = {
    // savePurchases,
    executeUpdateQuery,
    getAllPurchases,
    // executeDeleteAndUpdateQuery,
    getLastRbarcode,
    getLastInvoiceNumber
};
