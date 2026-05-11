
const db = require('../db');

const RepairModel = {
    add: (data) => {
        const sql = `
          INSERT INTO repairs (
            customer_id, account_name, mobile, email, address1, address2, address3, city, staff, delivery_date, 
            place, metal, counter, entry_type, repair_no, date, metal_type, item, 
            tag_no, description, purity, category, sub_category, gross_weight, pcs, estimated_dust, estimated_amt, 
            extra_weight, stone_value, making_charge, handling_charge, total, status, image
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    
        // Function to sanitize decimal fields
        const sanitizeDecimal = (value, defaultValue = 0) => {
            return value === "" || value === null ? defaultValue : value;
        };
    
        const values = [
            data.customer_id, data.account_name, data.mobile, data.email, data.address1, data.address2, data.address3, data.city, 
            data.staff, data.delivery_date, data.place, data.metal, data.counter, data.entry_type, data.repair_no, data.date, 
            data.metal_type, data.item, data.tag_no, data.description, data.purity, data.category, data.sub_category, 
            sanitizeDecimal(data.gross_weight, 0),  
            sanitizeDecimal(data.pcs, 0),  
            sanitizeDecimal(data.estimated_dust, 0),  
            sanitizeDecimal(data.estimated_amt, 0),  
            sanitizeDecimal(data.extra_weight, 0),  // ✅ Fix applied here
            sanitizeDecimal(data.stone_value, 0),  
            sanitizeDecimal(data.making_charge, 0),  
            sanitizeDecimal(data.handling_charge, 0),  
            sanitizeDecimal(data.total, 0),  
            data.status,  
            data.image,
        ];
    
        return new Promise((resolve, reject) => {
            db.query(sql, values, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    },
    

    getAll: () => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM repairs', (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getById: (id) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM repairs WHERE repair_id = ?', [id], (err, results) => {
                if (err) reject(err);
                resolve(results[0]);
            });
        });
    },

    update: (id, data) => {
        const sql = `
            UPDATE repairs SET 
                customer_id = ?, account_name = ?, mobile = ?, email = ?, address1 = ?, address2 = ?, address3 = ?, city = ?, 
                staff = ?, delivery_date = ?, place = ?, metal = ?, counter = ?,entry_type = ?, repair_no = ?, date = ?, metal_type = ?, item = ?, tag_no = ?, 
                description = ?, purity = ?, category = ?, sub_category = ?, gross_weight = ?, pcs = ?, estimated_dust = ?, estimated_amt = ?, extra_weight = ?, stone_value = ?, 
                making_charge = ?, handling_charge = ?, total = ?, status = ?, image = ?
            WHERE repair_id = ?
        `;
        const values = [
            data.customer_id,data.account_name, data.mobile, data.email, data.address1, data.address2, data.address3, data.city,
            data.staff, data.delivery_date, data.place, data.metal, data.counter, 
            data.entry_type, data.repair_no, data.date, data.metal_type, data.item, 
            data.tag_no, data.description, data.purity,data.category, data.sub_category, data.gross_weight, data.pcs, data.estimated_dust, data.estimated_amt, data.extra_weight, 
            data.stone_value, data.making_charge, data.handling_charge, data.total, data.status, data.image, id
        ];
        return new Promise((resolve, reject) => {
            db.query(sql, values, (err, result) => {
                if (err) reject(err);
                resolve(result.affectedRows > 0);
            });
        });
    },

    remove: (id) => {
        return new Promise((resolve, reject) => {
            db.query('DELETE FROM repairs WHERE repair_id = ?', [id], (err, result) => {
                if (err) reject(err);
                resolve(result.affectedRows > 0);
            });
        });
    },
  
    updateStatus: (id, status) => {
        return new Promise((resolve, reject) => {
            db.query(
                "UPDATE repairs SET status = ? WHERE repair_id = ?",
                [status, id],
                (err, results) => {
                    if (err) {
                        console.error('Error updating status:', err);
                        return reject(new Error('Failed to update repair status'));
                    }

                    // Check if any rows were affected
                    if (results.affectedRows > 0) {
                        resolve(true); // Status updated successfully
                    } else {
                        resolve(false); // No rows were updated (possibly invalid ID)
                    }
                }
            );
        });
    },

    // addDetails: (repair_id, details) => {
    //     const insertDetailsQuery = `
    //         INSERT INTO repairdetails 
    //         (repair_id, metal_type, description, weight, qty, rate_type, rate, overall_weight, overall_qty, overall_total) 
    //         VALUES ?
    //     `;

    //     const values = details.map((detail) => [
    //         repair_id,
    //         detail.metal_type,
    //         detail.description,
    //         detail.weight,
    //         detail.qty,
    //         detail.rate_type,
    //         detail.rate,
    //         detail.overall_weight,
    //         detail.overall_qty,
    //         detail.overall_total,

    //     ]);

    //     return new Promise((resolve, reject) => {
    //         db.query(insertDetailsQuery, [values], (err, result) => {
    //             if (err) reject(err);
    //             resolve(result);
    //         });
    //     });
    // },

    // fetchAllDetails: () => {
    //     const query = `
    //         SELECT * FROM repairdetails
    //     `;
    
    //     return new Promise((resolve, reject) => {
    //         db.query(query, (err, results) => {
    //             if (err) reject(err);
    //             resolve(results);
    //         });
    //     });
    // },
    
    // fetchDetailsByRepairId: (repair_id) => {
    //     const query = `
    //         SELECT * FROM repairdetails WHERE repair_id = ?
    //     `;
    
    //     return new Promise((resolve, reject) => {
    //         db.query(query, [repair_id], (err, results) => {
    //             if (err) reject(err);
    //             resolve(results);
    //         });
    //     });
    // },
    
    getLastRPNNumber: () => {
        const query = `
            SELECT repair_no FROM repairs 
            WHERE repair_no LIKE 'RPN%' 
            ORDER BY repair_no DESC
        `;
        
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },



};

module.exports = RepairModel;
