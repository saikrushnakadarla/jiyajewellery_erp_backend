const RepairModel = require('../models/repairModel');
const db = require('../db');

exports.addRepair = async (req, res) => {
    try {
        const result = await RepairModel.add(req.body);
        res.status(201).json({ message: 'Repair entry added successfully', repairId: result.insertId });
    } catch (error) {
        console.error('Error inserting repair entry:', error.message);
        res.status(500).json({ error: 'Failed to insert repair entry' });
    }
};

exports.getRepairs = async (req, res) => {
    try {
        const results = await RepairModel.getAll();
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching repair entries:', error.message);
        res.status(500).json({ error: 'Failed to fetch repair entries' });
    }
};

exports.getRepairById = async (req, res) => {
    try {
        const result = await RepairModel.getById(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Repair entry not found' });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching repair entry:', error.message);
        res.status(500).json({ error: 'Failed to fetch repair entry' });
    }
};

exports.updateRepair = async (req, res) => {
    try {
        const updated = await RepairModel.update(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ message: 'Repair entry not found' });
        }
        res.status(200).json({ message: 'Repair entry updated successfully' });
    } catch (error) {
        console.error('Error updating repair entry:', error.message);
        res.status(500).json({ error: 'Failed to update repair entry' });
    }
};

exports.deleteRepair = async (req, res) => {
    try {
        const deleted = await RepairModel.remove(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Repair entry not found' });
        }
        res.status(200).json({ message: 'Repair entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting repair entry:', error.message);
        res.status(500).json({ error: 'Failed to delete repair entry' });
    }
};

exports.updateRepairStatus = async (req, res) => {
    try {
        const { status } = req.body; // `status` is coming from the body
        const { id } = req.params;   // `id` is coming from the URL

        if (!id || !status) {
            return res.status(400).json({ error: "id and status are required" });
        }

        await RepairModel.updateStatus(id, status); // Ensure this function exists in your model
        res.status(200).json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("Error updating repair status:", error.message);
        res.status(500).json({ error: "Failed to update repair status" });
    }
};

// exports.addRepairDetails = async (req, res) => {
//     const { repair_id, details } = req.body;

//     if (!repair_id || !Array.isArray(details) || details.length === 0) {
//         return res.status(400).json({ error: 'Invalid input data' });
//     }

//     db.getConnection((err, connection) => {
//         if (err) {
//             console.error('Error getting database connection:', err);
//             return res.status(500).json({ error: 'Database connection failed' });
//         }

//         connection.beginTransaction(async (err) => {
//             if (err) {
//                 connection.release();
//                 console.error('Error starting transaction:', err);
//                 return res.status(500).json({ error: 'Transaction initialization failed' });
//             }

//             try {
//                 // Insert repair details
//                 const addDetailsQuery = `INSERT INTO repairdetails (repair_id, metal_type, description, weight, qty, rate_type, rate, overall_weight, overall_qty, overall_total) VALUES ?`;
//                 const detailsData = details.map(detail => [repair_id, detail.metal_type, detail.description, detail.weight, detail.qty, detail.rate_type, detail.rate, detail.overall_weight, detail.overall_qty, detail.overall_total]);
//                 await new Promise((resolve, reject) => {
//                     connection.query(addDetailsQuery, [detailsData], (err, result) => {
//                         if (err) return reject(err);
//                         resolve(result);
//                     });
//                 });

//                 // Calculate total price from details
//                 const totalPrice = details.reduce((total, detail) => {
//                     return total + (Number(detail.qty || 0) * Number(detail.rate || 0));
//                 }, 0);

//                 // Update the repair's total and status
//                 const updateRepairQuery = `
//                     UPDATE repairs 
//                     SET status = 'Receive from Workshop', total = ? 
//                     WHERE repair_id = ?
//                 `;
//                 const result = await new Promise((resolve, reject) => {
//                     connection.query(updateRepairQuery, [totalPrice, repair_id], (err, result) => {
//                         if (err) return reject(err);
//                         resolve(result);
//                     });
//                 });

//                 if (result.affectedRows === 0) {
//                     throw new Error('Failed to update repair total');
//                 }

//                 // Commit the transaction
//                 connection.commit((err) => {
//                     if (err) {
//                         connection.rollback(() => {
//                             connection.release();
//                         });
//                         console.error('Error committing transaction:', err);
//                         return res.status(500).json({ error: 'Transaction commit failed' });
//                     }

//                     connection.release();
//                     res.status(201).json({ message: 'Repair details added and status updated successfully' });
//                 });
//             } catch (error) {
//                 connection.rollback(() => {
//                     connection.release();
//                 });
//                 console.error('Error processing request:', error);
//                 res.status(500).json({ error: 'Failed to process request' });
//             }
//         });
//     });
// };

// exports.fetchAllRepairDetails = async (req, res) => {
//     try {
//         const details = await RepairModel.fetchAllDetails();
//         res.status(200).json(details);
//     } catch (error) {
//         console.error('Error fetching repair details:', error.message);
//         res.status(500).json({ error: 'Failed to fetch repair details' });
//     }
// };

// exports.fetchRepairDetailsByRepairId = async (req, res) => {
//     const { repair_id } = req.params;

//     if (!repair_id) {
//         return res.status(400).json({ error: 'Repair ID is required' });
//     }

//     try {
//         const details = await RepairModel.fetchDetailsByRepairId(repair_id);
//         if (details.length === 0) {
//             return res.status(404).json({ message: 'No repair details found for the given ID' });
//         }
//         res.status(200).json(details);
//     } catch (error) {
//         console.error('Error fetching repair details by ID:', error.message);
//         res.status(500).json({ error: 'Failed to fetch repair details' });
//     }
// };

// exports.updateOrderStatus = async (req, res) => {
//     const { invoice_number, order_status } = req.body;

//     // Validate input
//     if (!invoice_number || !order_status) {
//         return res.status(400).json({ error: 'invoice_number and order_status are required' });
//     }

//     try {
//         // Update order_status based on invoice_number
//         const result = await RepairModel.updateOrderStatus(invoice_number, order_status);

//         if (result) {
//             return res.status(200).json({ message: 'Order status updated successfully' });
//         } else {
//             return res.status(404).json({ error: 'No record found with the given invoice_number' });
//         }
//     } catch (error) {
//         console.error('Error updating order status:', error);
//         return res.status(500).json({ error: 'Failed to update order status' });
//     }
// };

exports.getLastRPNNumber = async (req, res) => {
    try {
        const result = await RepairModel.getLastRPNNumber();

        if (result.length > 0) {
            // Process RPN numbers to find the next one
            const rpnNumbers = result
                .map(row => row.repair_no)
                .filter(rpn => rpn.startsWith("RPN"))
                .map(rpn => parseInt(rpn.slice(3), 10)); // Extract numeric part

            const lastRPNNumber = Math.max(...rpnNumbers);
            const nextRPNNumber = `RPN${String(lastRPNNumber + 1).padStart(3, "0")}`;

            res.status(200).json({ lastRPNNumber: nextRPNNumber });
        } else {
            res.status(200).json({ lastRPNNumber: "RPN001" }); // Start with RPN001
        }
    } catch (error) {
        console.error("Error fetching last RPN number:", error.message);
        res.status(500).json({ error: "Failed to fetch last RPN number" });
    }
};









