const db = require('../db'); // Assuming `db` is the MySQL connection object.

const PaymentModel = {
   addPaymentAndUpdateRepair: (paymentData, discountAmt, cashAmt, paidWt, balWt, invoiceNumber, callback) => {
        db.getConnection((err, connection) => {
            if (err) {
                return callback(err);
            }

            connection.beginTransaction((transactionErr) => {
                if (transactionErr) {
                    connection.release();
                    return callback(transactionErr);
                }

                // Convert empty values to 0 instead of null
                const sanitizedPaymentData = paymentData.map(value =>
                    value === "" || value === undefined ? 0 : value
                );

                const paymentQuery = `
                    INSERT INTO payments (
                        transaction_type, date, mode, cheque_number, receipt_no, 
                        account_name, invoice_number, total_amt, discount_amt, cash_amt, remarks, total_wt, paid_wt, bal_wt, category, mobile
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
                `;

                connection.query(paymentQuery, sanitizedPaymentData, (paymentErr, paymentResult) => {
                    if (paymentErr) {
                        return connection.rollback(() => {
                            connection.release();
                            callback(paymentErr);
                        });
                    }

                    const transactionType = sanitizedPaymentData[0];

                    if (transactionType === 'Receipt') {
                        const updateReceiptsAmtQuery = `
                            UPDATE repair_details
                            SET receipts_amt = COALESCE(receipts_amt, 0) + ?
                            WHERE invoice_number = ?
                        `;
                        connection.query(updateReceiptsAmtQuery, [discountAmt || 0, invoiceNumber], (updateReceiptsAmtErr) => {
                            if (updateReceiptsAmtErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(updateReceiptsAmtErr);
                                });
                            }

                            const updateBalAfterReceiptsQuery = `
                                UPDATE repair_details
                                SET bal_after_receipts = bal_amt - receipts_amt
                                WHERE invoice_number = ?
                            `;
                            connection.query(updateBalAfterReceiptsQuery, [invoiceNumber], (updateBalAfterReceiptsErr) => {
                                if (updateBalAfterReceiptsErr) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        callback(updateBalAfterReceiptsErr);
                                    });
                                }

                                connection.commit((commitErr) => {
                                    if (commitErr) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            callback(commitErr);
                                        });
                                    }

                                    connection.release();
                                    callback(null, paymentResult.insertId);
                                });
                            });
                        });
                    } else if (transactionType === 'Payment') {
                        const updatePaidAmtQuery = `
                            UPDATE purchases
                            SET 
                                paid_amt = COALESCE(paid_amt, 0) + ?,
                                paid_wt = COALESCE(paid_wt, 0) + ?
                            WHERE invoice = ?
                        `;
                        connection.query(updatePaidAmtQuery, [discountAmt || 0, paidWt || 0, invoiceNumber], (updatePaidAmtErr) => {
                            if (updatePaidAmtErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(updatePaidAmtErr);
                                });
                            }

                            const updateBalanceDueQuery = `
                                UPDATE purchases
                                SET 
                                    balance_after_receipt = balance_amount - paid_amt,
                                    balWt_after_payment = COALESCE(balance_pure_weight, 0) - COALESCE(paid_wt, 0),
                                    bal_wt_amt = ?
                                WHERE invoice = ?
                            `;
                            connection.query(updateBalanceDueQuery, [balWt || 0, invoiceNumber], (updateBalanceDueErr) => {
                                if (updateBalanceDueErr) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        callback(updateBalanceDueErr);
                                    });
                                }

                                connection.commit((commitErr) => {
                                    if (commitErr) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            callback(commitErr);
                                        });
                                    }

                                    connection.release();
                                    callback(null, paymentResult.insertId);
                                });
                            });
                        });
                    } else if (transactionType === 'Advance Receipt') {
                        // For Advance Receipt, just commit the transaction without updating any other tables
                        // Only store the payment details in payments table
                        
                        connection.commit((commitErr) => {
                            if (commitErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(commitErr);
                                });
                            }

                            connection.release();
                            callback(null, paymentResult.insertId);
                        });
                    } else {
                        connection.commit((commitErr) => {
                            if (commitErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(commitErr);
                                });
                            }

                            connection.release();
                            callback(null, paymentResult.insertId);
                        });
                    }
                });
            });
        });
    },

    getPayments: (conditions, values, callback) => {
        let query = 'SELECT * FROM payments';
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        db.query(query, values, callback);
    },

    updatePayment: (updates, values, callback) => {
        const query = `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`;
        db.query(query, values, callback);
    },

    deletePayment: (paymentId, callback) => {
        const query = 'DELETE FROM payments WHERE id = ?';
        db.query(query, [paymentId], callback);
    },

    getPaymentById: (id, callback) => {
        let query = 'SELECT * FROM payments WHERE id = ?';
        db.query(query, [id], callback);
    },

    addPaymentAndUpdateOrder: (paymentData, discountAmt, cashAmt, paidWt, balWt, invoiceNumber, callback) => {
        db.getConnection((err, connection) => {
            if (err) {
                return callback(err);
            }

            connection.beginTransaction((transactionErr) => {
                if (transactionErr) {
                    connection.release();
                    return callback(transactionErr);
                }

                // Convert empty values to 0 instead of null
                const sanitizedPaymentData = paymentData.map(value =>
                    value === "" || value === undefined ? 0 : value
                );

                const paymentQuery = `
                    INSERT INTO payments (
                        transaction_type, date, mode, cheque_number, receipt_no, 
                        account_name, invoice_number, total_amt, discount_amt, cash_amt, remarks, total_wt, paid_wt, bal_wt, category, mobile
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
                `;

                connection.query(paymentQuery, sanitizedPaymentData, (paymentErr, paymentResult) => {
                    if (paymentErr) {
                        return connection.rollback(() => {
                            connection.release();
                            callback(paymentErr);
                        });
                    }

                    const transactionType = sanitizedPaymentData[0];

                    if (transactionType === 'Receipt') {
                        const updateReceiptsAmtQuery = `
                            UPDATE repair_details
                            SET receipts_amt = COALESCE(receipts_amt, 0) + ?
                            WHERE order_number = ?
                        `;
                        connection.query(updateReceiptsAmtQuery, [discountAmt || 0, invoiceNumber], (updateReceiptsAmtErr) => {
                            if (updateReceiptsAmtErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(updateReceiptsAmtErr);
                                }); 
                            }

                            const updateBalAfterReceiptsQuery = `
                                UPDATE repair_details
                                SET bal_after_receipts = bal_amt - receipts_amt
                                WHERE order_number = ?
                            `;
                            connection.query(updateBalAfterReceiptsQuery, [invoiceNumber], (updateBalAfterReceiptsErr) => {
                                if (updateBalAfterReceiptsErr) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        callback(updateBalAfterReceiptsErr);
                                    });
                                }

                                connection.commit((commitErr) => {
                                    if (commitErr) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            callback(commitErr);
                                        });
                                    }

                                    connection.release();
                                    callback(null, paymentResult.insertId);
                                });
                            });
                        });
                    } else if (transactionType === 'Payment') {
                        const updatePaidAmtQuery = `
                            UPDATE purchases
                            SET 
                                paid_amt = COALESCE(paid_amt, 0) + ?,
                                paid_wt = COALESCE(paid_wt, 0) + ?
                            WHERE invoice = ?
                        `;
                        connection.query(updatePaidAmtQuery, [discountAmt || 0, paidWt || 0, invoiceNumber], (updatePaidAmtErr) => {
                            if (updatePaidAmtErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(updatePaidAmtErr);
                                });
                            }

                            const updateBalanceDueQuery = `
                                UPDATE purchases
                                SET 
                                    balance_after_receipt = balance_amount - paid_amt,
                                    balWt_after_payment = COALESCE(balance_pure_weight, 0) - COALESCE(paid_wt, 0),
                                    bal_wt_amt = ?
                                WHERE invoice = ?
                            `;
                            connection.query(updateBalanceDueQuery, [balWt || 0, invoiceNumber], (updateBalanceDueErr) => {
                                if (updateBalanceDueErr) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        callback(updateBalanceDueErr);
                                    });
                                }

                                connection.commit((commitErr) => {
                                    if (commitErr) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            callback(commitErr);
                                        });
                                    }

                                    connection.release();
                                    callback(null, paymentResult.insertId);
                                });
                            });
                        });
                    } else {
                        connection.commit((commitErr) => {
                            if (commitErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(commitErr);
                                });
                            }

                            connection.release();
                            callback(null, paymentResult.insertId);
                        });
                    }
                });
            });
        });
    },


};

module.exports = PaymentModel;
