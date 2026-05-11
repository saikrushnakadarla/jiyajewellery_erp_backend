const PaymentModel = require('../models/paymentModel');
const db = require('../db');
const fs = require("fs");
const path = require("path");

exports.addPayment = (req, res) => {
    const {
        date, mode, transaction_type, cheque_number, receipt_no, account_name, invoice_number,
        total_amt, discount_amt, cash_amt, remarks, total_wt, paid_wt, bal_wt, category, mobile
    } = req.body;

    // Check for required fields
    if (!transaction_type || !date || !receipt_no || !account_name || !invoice_number) {
        return res.status(400).json({ error: 'Required fields are missing.' });
    }

    // Ensure mode is NULL if empty
    const modeValue = mode && mode.trim() !== '' ? mode : null;

    // Prepare data for payment insertion
    const paymentData = [
        transaction_type, date, modeValue, cheque_number || null, receipt_no,
        account_name, invoice_number, total_amt, discount_amt || 0, cash_amt || 0, remarks || null, total_wt, paid_wt, bal_wt, category, mobile
    ];

    // Call the model method
    PaymentModel.addPaymentAndUpdateRepair(
        paymentData,
        discount_amt || 0, cash_amt || 0, paid_wt || 0, bal_wt || 0, invoice_number,
        (err, paymentId) => {
            if (err) {
                console.error('Error adding payment and updating repair details:', err.message);
                return res.status(500).json({ error: 'Failed to process payment.', details: err.message });
            }

            // Respond with success
            res.status(201).json({
                message: 'Payment record added and repair details updated successfully.',
                paymentId: paymentId,
            });
        }
    );
};

exports.getPayments = (req, res) => {
    const { date, mode, account_name } = req.query;

    let conditions = [];
    let values = [];

    if (date) conditions.push('date = ?') && values.push(date);
    if (mode) conditions.push('mode = ?') && values.push(mode);
    if (account_name) conditions.push('account_name LIKE ?') && values.push(`%${account_name}%`);

    PaymentModel.getPayments(conditions, values, (err, results) => {
        if (err) {
            console.error('Error retrieving payment records:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve payment records.' });
        }
        res.status(200).json({ payments: results });
    });
};

exports.getPaymentById = (req, res) => {
    const { id } = req.params; // Extract id from URL parameter

    if (!id) {
        return res.status(400).json({ error: 'Payment ID is required' });
    }

    PaymentModel.getPaymentById(id, (err, result) => {
        if (err) {
            console.error('Error retrieving payment record:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve payment record.' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.status(200).json({ payment: result[0] });
    });
};

exports.updatePayment = (req, res) => {
    const { id } = req.params;
    const {
        transaction_type, date, mode, cheque_number, receipt_no, account_name, invoice_number,
        total_amt, discount_amt, cash_amt, remarks, category, mobile
    } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Payment ID is required.' });
    }

    // Fetch existing payment details first
    const fetchQuery = `SELECT discount_amt, cash_amt, invoice_number FROM payments WHERE id = ?`;

    db.query(fetchQuery, [id], (err, results) => {
        if (err) {
            console.error('Error fetching payment details:', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment record.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Payment record not found.' });
        }

        const { discount_amt: oldDiscount, cash_amt: oldCash, invoice_number } = results[0];

        // First update in repair_details
        const updateRepairDetails1 = `
            UPDATE repair_details 
            SET bal_after_receipts = bal_after_receipts + ?, receipts_amt = receipts_amt - ? 
            WHERE invoice_number = ?
        `;

        db.query(updateRepairDetails1, [oldDiscount, oldDiscount, invoice_number], (err) => {
            if (err) {
                console.error('Error updating repair_details (step 1):', err.message);
                return res.status(500).json({ error: 'Failed to update repair details.' });
            }

            // Second update with new values
            const updateRepairDetails2 = `
                UPDATE repair_details 
                SET bal_after_receipts = bal_after_receipts - ?, receipts_amt = receipts_amt + ? 
                WHERE invoice_number = ?
            `;

            db.query(updateRepairDetails2, [discount_amt, discount_amt, invoice_number], (err) => {
                if (err) {
                    console.error('Error updating repair_details (step 2):', err.message);
                    return res.status(500).json({ error: 'Failed to update repair details.' });
                }

                // Now update the payments table
                let updates = [];
                let values = [];

                if (transaction_type) updates.push('transaction_type = ?'), values.push(transaction_type);
                if (date) updates.push('date = ?'), values.push(date);
                if (mode) updates.push('mode = ?'), values.push(mode);
                if (cheque_number) updates.push('cheque_number = ?'), values.push(cheque_number);
                if (receipt_no) updates.push('receipt_no = ?'), values.push(receipt_no);
                if (account_name) updates.push('account_name = ?'), values.push(account_name);
                if (invoice_number) updates.push('invoice_number = ?'), values.push(invoice_number);
                if (total_amt) updates.push('total_amt = ?'), values.push(total_amt);
                if (discount_amt) updates.push('discount_amt = ?'), values.push(discount_amt);
                if (cash_amt) updates.push('cash_amt = ?'), values.push(cash_amt);
                if (remarks) updates.push('remarks = ?'), values.push(remarks);
                if (category) updates.push('category = ?'), values.push(category);
                if (mobile) updates.push('mobile = ?'), values.push(mobile);

                if (updates.length === 0) {
                    return res.status(400).json({ error: 'No fields provided for update.' });
                }

                values.push(id);

                const updatePaymentQuery = `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`;

                db.query(updatePaymentQuery, values, (err, result) => {
                    if (err) {
                        console.error('Error updating payment record:', err.message);
                        return res.status(500).json({ error: 'Failed to update payment record.' });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Payment record not found.' });
                    }
                    res.status(200).json({ message: 'Payment record updated successfully.' });
                });
            });
        });
    });
};

exports.deletePayment = (req, res) => {
    const { id } = req.params;

    // Validate the id parameter
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid or missing payment ID.' });
    }

    // Step 1: Get invoice_number, discount_amt, receipt_no
    const getPaymentQuery = `
        SELECT invoice_number, discount_amt, receipt_no 
        FROM payments 
        WHERE id = ?
    `;

    db.query(getPaymentQuery, [id], (err, result) => {
        if (err) {
            console.error('Database error fetching payment record:', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment record.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Payment record not found.' });
        }

        const { invoice_number, discount_amt, receipt_no } = result[0];

        // Step 2: Update repair_details (reverse receipts and balance)
        const updateRepairDetailsQuery = `
            UPDATE repair_details 
            SET receipts_amt = receipts_amt - ?, 
                bal_after_receipts = bal_after_receipts + ? 
            WHERE invoice_number = ?
        `;

        db.query(updateRepairDetailsQuery, [discount_amt, discount_amt, invoice_number], (err) => {
            if (err) {
                console.error('Database error updating repair details:', err.message);
                return res.status(500).json({ error: 'Failed to update repair details.' });
            }

            // Step 3: Delete the receipt PDF file (if exists)
            if (receipt_no) {
                const filePath = path.join(__dirname, "../uploads/invoices", `${receipt_no}.pdf`);

                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== "ENOENT") {
                        console.error("Error deleting receipt PDF:", unlinkErr);
                    }
                });
            }

            // Step 4: Delete the payment record
            const deletePaymentQuery = `DELETE FROM payments WHERE id = ?`;

            db.query(deletePaymentQuery, [id], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting payment record:', err.message);
                    return res.status(500).json({ error: 'Failed to delete payment record.' });
                }
                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ error: 'Payment record not found.' });
                }

                return res.status(200).json({
                    message: 'Payment deleted, repair details updated, and receipt PDF removed.'
                });
            });
        });
    });
};

exports.updatePurchasePayment = (req, res) => {
    const { id } = req.params;
    const {
        transaction_type, date, mode, cheque_number, receipt_no, account_name, invoice_number,
        total_amt, discount_amt, cash_amt, remarks, total_wt, paid_wt, bal_wt, category, mobile
    } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Payment ID is required.' });
    }

    // Fetch existing payment details first
    const fetchQuery = `SELECT discount_amt, cash_amt, paid_wt, bal_wt, invoice_number FROM payments WHERE id = ?`;

    db.query(fetchQuery, [id], (err, results) => {
        if (err) {
            console.error('Error fetching payment details:', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment record.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Payment record not found.' });
        }

        const { discount_amt: oldDiscount, cash_amt: oldCash, paid_wt: oldPaidWt, bal_wt: oldbalWt, invoice_number } = results[0];

        // First update in repair_details
        const updateRepairDetails1 = `
            UPDATE purchases 
            SET balance_after_receipt = balance_after_receipt + ?, paid_amt = paid_amt - ? , 
            balWt_after_payment = balWt_after_payment + ?, paid_wt = paid_wt - ?
            WHERE invoice = ?
        `;

        db.query(updateRepairDetails1, [oldDiscount, oldDiscount, oldPaidWt, oldPaidWt, invoice_number], (err) => {
            if (err) {
                console.error('Error updating repair_details (step 1):', err.message);
                return res.status(500).json({ error: 'Failed to update repair details.' });
            }

            // Second update with new values
            const updateRepairDetails2 = `
                UPDATE purchases 
                SET balance_after_receipt = balance_after_receipt - ?, paid_amt = paid_amt + ?,
                balWt_after_payment = balWt_after_payment - ?, paid_wt = paid_wt + ?
                WHERE invoice = ?
            `;

            db.query(updateRepairDetails2, [discount_amt, discount_amt, paid_wt, paid_wt, invoice_number], (err) => {
                if (err) {
                    console.error('Error updating repair_details (step 2):', err.message);
                    return res.status(500).json({ error: 'Failed to update repair details.' });
                }

                // Now update the payments table
                let updates = [];
                let values = [];

                if (transaction_type) updates.push('transaction_type = ?'), values.push(transaction_type);
                if (date) updates.push('date = ?'), values.push(date);
                if (mode) updates.push('mode = ?'), values.push(mode);
                if (cheque_number) updates.push('cheque_number = ?'), values.push(cheque_number);
                if (receipt_no) updates.push('receipt_no = ?'), values.push(receipt_no);
                if (account_name) updates.push('account_name = ?'), values.push(account_name);
                if (invoice_number) updates.push('invoice_number = ?'), values.push(invoice_number);
                if (total_amt) updates.push('total_amt = ?'), values.push(total_amt);
                if (discount_amt) updates.push('discount_amt = ?'), values.push(discount_amt);
                if (cash_amt) updates.push('cash_amt = ?'), values.push(cash_amt);
                if (remarks) updates.push('remarks = ?'), values.push(remarks);
                if (total_wt) updates.push('total_wt = ?'), values.push(total_wt);
                if (paid_wt) updates.push('paid_wt = ?'), values.push(paid_wt);
                if (bal_wt) updates.push('bal_wt = ?'), values.push(bal_wt);
                if (category) updates.push('category = ?'), values.push(category);
                if (mobile) updates.push('mobile = ?'), values.push(mobile);

                if (updates.length === 0) {
                    return res.status(400).json({ error: 'No fields provided for update.' });
                }

                values.push(id);

                const updatePaymentQuery = `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`;

                db.query(updatePaymentQuery, values, (err, result) => {
                    if (err) {
                        console.error('Error updating payment record:', err.message);
                        return res.status(500).json({ error: 'Failed to update payment record.' });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Payment record not found.' });
                    }
                    res.status(200).json({ message: 'Payment record updated successfully.' });
                });
            });
        });
    });
};

exports.deletePurchasePayment = (req, res) => {
    const { id } = req.params;

    // Validate the id parameter
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid or missing payment ID.' });
    }

    // Step 1: Get the invoice_number, discount_amt, and cash_amt of the payment to be deleted
    const getPaymentQuery = `SELECT invoice_number, discount_amt, cash_amt, paid_wt, bal_wt  FROM payments WHERE id = ?`;

    db.query(getPaymentQuery, [id], (err, result) => {
        if (err) {
            console.error('Database error fetching payment record:', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment record.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Payment record not found.' });
        }

        const { invoice_number, discount_amt, cash_amt, paid_wt, bal_wt } = result[0];

        // Ensure discount_amt and cash_amt are treated as numbers
        const new_bal_wt_amt = (Number(discount_amt) || 0) + (Number(cash_amt) || 0);

        // Step 2: Update purchases with new paid_amt, balance_after_receipt, and bal_wt_amt
        const updateRepairDetailsQuery = `
            UPDATE purchases 
            SET 
                paid_amt = paid_amt - ?, 
                balance_after_receipt = balance_after_receipt + ?,
                paid_wt = paid_wt - ?,
                balWt_after_payment = balWt_after_payment + ?,
                bal_wt_amt = ? 
            WHERE invoice = ?`;

        db.query(updateRepairDetailsQuery, [discount_amt, discount_amt, paid_wt, paid_wt, new_bal_wt_amt, invoice_number], (err, updateResult) => {
            if (err) {
                console.error('Database error updating repair details:', err.message);
                return res.status(500).json({ error: 'Failed to update repair details.' });
            }

            // Step 3: Delete the payment record after updating purchases
            const deletePaymentQuery = `DELETE FROM payments WHERE id = ?`;

            db.query(deletePaymentQuery, [id], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting payment record:', err.message);
                    return res.status(500).json({ error: 'Failed to delete payment record.' });
                }
                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ error: 'Payment record not found.' });
                }

                res.status(200).json({ message: 'Payment record deleted successfully and purchase details updated.' });
            });
        });
    });
};

exports.addOrderPayment = (req, res) => {
    const {
        date, mode, transaction_type, cheque_number, receipt_no, account_name, invoice_number,
        total_amt, discount_amt, cash_amt, remarks, total_wt, paid_wt, bal_wt, category, mobile
    } = req.body;

    // Check for required fields
    if (!transaction_type || !date || !receipt_no || !account_name || !invoice_number) {
        return res.status(400).json({ error: 'Required fields are missing.' });
    }

    // Ensure mode is NULL if empty
    const modeValue = mode && mode.trim() !== '' ? mode : null;

    // Prepare data for payment insertion
    const paymentData = [
        transaction_type, date, modeValue, cheque_number || null, receipt_no,
        account_name, invoice_number, total_amt, discount_amt || 0, cash_amt || 0, remarks || null, total_wt, paid_wt, bal_wt, category, mobile
    ];

    // Call the model method
    PaymentModel.addPaymentAndUpdateOrder(
        paymentData,
        discount_amt || 0, cash_amt || 0, paid_wt || 0, bal_wt || 0, invoice_number,
        (err, paymentId) => {
            if (err) {
                console.error('Error adding payment and updating repair details:', err.message);
                return res.status(500).json({ error: 'Failed to process payment.', details: err.message });
            }

            // Respond with success
            res.status(201).json({
                message: 'Payment record added and repair details updated successfully.',
                paymentId: paymentId,
            });
        }
    );
};

exports.updateOrderPayment = (req, res) => {
    const { id } = req.params;
    const {
        transaction_type, date, mode, cheque_number, receipt_no, account_name, invoice_number,
        total_amt, discount_amt, cash_amt, remarks, category, mobile
    } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'Payment ID is required.' });
    }

    // Fetch existing payment details first
    const fetchQuery = `SELECT discount_amt, cash_amt, invoice_number FROM payments WHERE id = ?`;

    db.query(fetchQuery, [id], (err, results) => {
        if (err) {
            console.error('Error fetching payment details:', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment record.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Payment record not found.' });
        }

        const { discount_amt: oldDiscount, cash_amt: oldCash, invoice_number } = results[0];

        // First update in repair_details
        const updateRepairDetails1 = `
            UPDATE repair_details 
            SET bal_after_receipts = bal_after_receipts + ?, receipts_amt = receipts_amt - ? 
            WHERE order_number = ?
        `;

        db.query(updateRepairDetails1, [oldDiscount, oldDiscount, invoice_number], (err) => {
            if (err) {
                console.error('Error updating repair_details (step 1):', err.message);
                return res.status(500).json({ error: 'Failed to update repair details.' });
            }

            // Second update with new values
            const updateRepairDetails2 = `
                UPDATE repair_details 
                SET bal_after_receipts = bal_after_receipts - ?, receipts_amt = receipts_amt + ? 
                WHERE order_number = ?
            `;

            db.query(updateRepairDetails2, [discount_amt, discount_amt, invoice_number], (err) => {
                if (err) {
                    console.error('Error updating repair_details (step 2):', err.message);
                    return res.status(500).json({ error: 'Failed to update repair details.' });
                }

                // Now update the payments table
                let updates = [];
                let values = [];

                if (transaction_type) updates.push('transaction_type = ?'), values.push(transaction_type);
                if (date) updates.push('date = ?'), values.push(date);
                if (mode) updates.push('mode = ?'), values.push(mode);
                if (cheque_number) updates.push('cheque_number = ?'), values.push(cheque_number);
                if (receipt_no) updates.push('receipt_no = ?'), values.push(receipt_no);
                if (account_name) updates.push('account_name = ?'), values.push(account_name);
                if (invoice_number) updates.push('invoice_number = ?'), values.push(invoice_number);
                if (total_amt) updates.push('total_amt = ?'), values.push(total_amt);
                if (discount_amt) updates.push('discount_amt = ?'), values.push(discount_amt);
                if (cash_amt) updates.push('cash_amt = ?'), values.push(cash_amt);
                if (remarks) updates.push('remarks = ?'), values.push(remarks);
                if (category) updates.push('category = ?'), values.push(category);
                if (mobile) updates.push('mobile = ?'), values.push(mobile);

                if (updates.length === 0) {
                    return res.status(400).json({ error: 'No fields provided for update.' });
                }

                values.push(id);

                const updatePaymentQuery = `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`;

                db.query(updatePaymentQuery, values, (err, result) => {
                    if (err) {
                        console.error('Error updating payment record:', err.message);
                        return res.status(500).json({ error: 'Failed to update payment record.' });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Payment record not found.' });
                    }
                    res.status(200).json({ message: 'Payment record updated successfully.' });
                });
            });
        });
    });
};


exports.deleteOrderPayment = (req, res) => {
    const { id } = req.params;

    // Validate the id parameter
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid or missing payment ID.' });
    }

    // Step 1: Get the invoice_number, discount_amt, and receipt_no
    const getPaymentQuery = `
        SELECT invoice_number, discount_amt, receipt_no 
        FROM payments 
        WHERE id = ?
    `;

    db.query(getPaymentQuery, [id], (err, result) => {
        if (err) {
            console.error('Database error fetching payment record:', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment record.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Payment record not found.' });
        }

        const { invoice_number, discount_amt, receipt_no } = result[0];

        // Step 2: Update repair_details (reverse receipts and balance)
        const updateRepairDetailsQuery = `
            UPDATE repair_details 
            SET receipts_amt = receipts_amt - ?, 
                bal_after_receipts = bal_after_receipts + ? 
            WHERE order_number = ?
        `;

        db.query(updateRepairDetailsQuery, [discount_amt, discount_amt, invoice_number], (err, updateResult) => {
            if (err) {
                console.error('Database error updating repair details:', err.message);
                return res.status(500).json({ error: 'Failed to update repair details.' });
            }

            // Step 3: Delete the PDF receipt file — do this BEFORE deleting DB record
            if (receipt_no) {
                const filePath = path.join(__dirname, "../uploads/invoices", `${receipt_no}.pdf`);

                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== "ENOENT") {
                        console.error("Error deleting receipt PDF:", unlinkErr);
                    }
                });
            }

            // Step 4: Delete the payment record
            const deletePaymentQuery = `DELETE FROM payments WHERE id = ?`;

            db.query(deletePaymentQuery, [id], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting payment record:', err.message);
                    return res.status(500).json({ error: 'Failed to delete payment record.' });
                }
                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ error: 'Payment record not found.' });
                }

                res.status(200).json({
                    message: 'Payment deleted successfully, repair details updated, and receipt PDF removed.'
                });
            });
        });
    });
};






