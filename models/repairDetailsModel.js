const db = require('../db');

const AssignedRepairDetails = {
    bulkInsert: (data) => {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO assigned_repairdetails (repair_id, item_name, purity, qty, weight, rate_type, rate, amount)
                VALUES ?
            `;
            const values = data.map((item) => [
                item.repair_id,
                item.item_name,
                item.purity,
                item.qty,
                item.weight,
                item.rate_type,
                item.rate,
                item.amount,
            ]);

            db.query(query, [values], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    },

    updateRepairStatus: (repairIds) => {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE repairs
                SET status = 'Assign to Workshop'
                WHERE repair_id IN (?)
            `;

            db.query(query, [repairIds], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    },

    fetchAssignedRepairDetails: async () => {
        const query = `
            SELECT * FROM assigned_repairdetails
        `;

        return new Promise((resolve, reject) => {
            db.query(query, (error, results) => {
                if (error) {
                    return reject(error);
                }
                resolve(results); // Resolve with the results (rows)
            });
        });
    },

    deleteAssignedRepairDetailById: async (repairId) => {
        const query = 'DELETE FROM assigned_repairdetails WHERE id = ?';
        return new Promise((resolve, reject) => {
            db.query(query, [repairId], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result); // Resolve with the result of the delete operation
            });
        });
    },

    updateRepairDetails: async (repairId, grossWtAfterRepair, totalAmt, mc_for_repair) => {

        const query = `
            UPDATE repairs 
            SET gross_wt_after_repair = ?, total_amt = ?, making_charge = ?, status = 'Receive from Workshop'
            WHERE repair_id = ?
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [grossWtAfterRepair, totalAmt, mc_for_repair, repairId], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    },

    updateStatus: async (repairId, status) => {
        const query = `
          UPDATE repairs
          SET status = ?
          WHERE repair_id = ?
        `;

        return new Promise((resolve, reject) => {
            db.query(query, [status, repairId], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result); // Resolve the query result
            });
        });
    },

    fetchAssignedRepairDetailsById: async (id) => {
        const query = `SELECT * FROM assigned_repairdetails WHERE repair_id = ?`;

        return new Promise((resolve, reject) => {
            db.query(query, [id], (error, results) => {
                if (error) return reject(error);
                resolve(results); // Return the full results array instead of a single item
            });
        });
    },

    updateAssignedRepairDetail: (id, item_name, purity, qty, weight, rate_type, rate, amount) => {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE assigned_repairdetails 
                SET item_name = ?, purity = ?, qty = ?, weight = ?, rate_type = ?, rate = ?, amount = ?
                WHERE id = ?
            `;
    
            db.query(query, [item_name, purity, qty, weight, rate_type, rate, amount, id], (error, results) => {
                if (error) {
                    reject(error); // Reject the promise on error
                } else {
                    resolve(results); // Resolve with query results
                }
            });
        });
    }
    

};

module.exports = AssignedRepairDetails;
