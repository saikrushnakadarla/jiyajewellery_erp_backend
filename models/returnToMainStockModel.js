const db = require("../db");

// =============================================
// INSERT: Save return to main stock with capture image
// =============================================
exports.insert = (
    return_data,
    from_stock_point_id,
    to_stock_point_id,
    return_date,
    reference_number,
    remarks,
    created_by,
    from_user_id = null,
    to_user_id = null,
    capture_image = null,  // <-- Capture image path
    callback
) => {
    if (typeof from_user_id === 'function') {
        callback = from_user_id;
        from_user_id = null;
        to_user_id = null;
        capture_image = null;
    }
    if (typeof to_user_id === 'function' && callback) {
        callback = to_user_id;
        to_user_id = null;
        capture_image = null;
    }
    if (typeof capture_image === 'function' && callback) {
        callback = capture_image;
        capture_image = null;
    }

    if (!Array.isArray(return_data) || return_data.length === 0) {
        return callback(new Error("Invalid return_data array"));
    }

    const return_number = reference_number;
    const return_date_formatted = return_date || new Date().toISOString().split('T')[0];

    let totalItems = return_data.length;
    let totalQuantity = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    return_data.forEach(item => {
        totalQuantity += parseFloat(item.qty) || 0;
        totalGrossWeight += parseFloat(item.gross_weight) || 0;
        totalNetWeight += parseFloat(item.net_weight) || 0;
    });

    // Insert main return record with capture_image column
    const insertReturnSql = `
        INSERT INTO return_to_main_stock_transfers (
            return_number,
            from_stock_point_id,
            to_stock_point_id,
            from_user_id,
            to_user_id,
            return_date,
            total_items,
            total_quantity,
            total_gross_weight,
            total_net_weight,
            status,
            remarks,
            capture_image,
            created_by,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const returnParams = [
        return_number,
        from_stock_point_id || null,
        to_stock_point_id || null,
        from_user_id || null,
        to_user_id || null,
        return_date_formatted,
        totalItems,
        totalQuantity,
        totalGrossWeight,
        totalNetWeight,
        'completed',
        remarks || null,
        capture_image || null,  // <-- Store capture image path
        created_by || null
    ];

    db.query(insertReturnSql, returnParams, (err, returnResult) => {
        if (err) {
            console.error("Error inserting return transfer:", err);
            return callback(err);
        }

        const returnId = returnResult.insertId;

        const insertItemsSql = `
            INSERT INTO return_to_main_stock_items (
                return_id,
                assigned_item_id,
                product_id,
                PCode_BarCode,
                product_name,
                metal_type,
                purity,
                category,
                sub_category,
                design_name,
                qty,
                gross_weight,
                stone_weight,
                net_weight,
                rate,
                making_charges,
                stone_price,
                total_price,
                image,
                remarks,
                created_at
            ) VALUES ?
        `;

        const itemValues = return_data.map(item => {
            // Process image path
            let imagePath = item.image || null;
            if (imagePath && imagePath.startsWith('http')) {
                const urlObj = new URL(imagePath);
                imagePath = urlObj.pathname;
            }
            if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
                imagePath = '/' + imagePath;
            }

            return [
                returnId,
                item.item_id || null,
                item.product_id || null,
                item.PCode_BarCode || null,
                item.product_name || null,
                item.metal_type || null,
                item.purity || null,
                item.category || null,
                item.sub_category || null,
                item.design_name || null,
                parseFloat(item.qty) || 0,
                parseFloat(item.gross_weight) || 0,
                parseFloat(item.stone_weight) || 0,
                parseFloat(item.net_weight) || 0,
                parseFloat(item.rate) || 0,
                parseFloat(item.making_charges) || 0,
                parseFloat(item.stone_price) || 0,
                parseFloat(item.total_price) || 0,
                imagePath,
                item.remarks || null,
                new Date()
            ];
        });

        db.query(insertItemsSql, [itemValues], (itemsErr) => {
            if (itemsErr) {
                console.error("Error inserting return items:", itemsErr);
                return callback(itemsErr);
            }
            
            console.log(`✅ Return ${return_number} saved with ${itemValues.length} items.`);
            console.log(`📷 Capture image: ${capture_image || 'None'}`);
            callback(null, { return_id: returnId, return_number: return_number });
        });
    });
};

// =============================================
// GET ALL: Get all return transfers with capture_image
// =============================================
exports.getAll = (callback) => {
    const sql = `
        SELECT 
            rt.return_id,
            rt.return_number,
            rt.from_stock_point_id,
            rt.to_stock_point_id,
            rt.from_user_id,
            rt.to_user_id,
            rt.return_date,
            rt.total_items,
            rt.total_quantity,
            rt.total_gross_weight,
            rt.total_net_weight,
            rt.status,
            rt.remarks,
            rt.capture_image,
            rt.created_by,
            rt.created_at,
            rt.updated_at,
            sp1.stock_point_name as from_stock_point_name,
            sp2.stock_point_name as to_stock_point_name,
            ad.account_name as from_user_name
        FROM return_to_main_stock_transfers rt
        LEFT JOIN stock_points sp1 ON rt.from_stock_point_id = sp1.stock_point_id
        LEFT JOIN stock_points sp2 ON rt.to_stock_point_id = sp2.stock_point_id
        LEFT JOIN account_details ad ON rt.from_user_id = ad.account_id
        ORDER BY rt.created_at DESC
    `;
    db.query(sql, callback);
};

// =============================================
// GET BY ID: Get return transfer by ID with capture_image
// =============================================
exports.getById = (return_id, callback) => {
    const mainSql = `
        SELECT 
            rt.return_id,
            rt.return_number,
            rt.from_stock_point_id,
            rt.to_stock_point_id,
            rt.from_user_id,
            rt.to_user_id,
            rt.return_date,
            rt.total_items,
            rt.total_quantity,
            rt.total_gross_weight,
            rt.total_net_weight,
            rt.status,
            rt.remarks,
            rt.capture_image,
            rt.created_by,
            rt.created_at,
            rt.updated_at,
            sp1.stock_point_name as from_stock_point_name,
            sp2.stock_point_name as to_stock_point_name,
            ad.account_name as from_user_name
        FROM return_to_main_stock_transfers rt
        LEFT JOIN stock_points sp1 ON rt.from_stock_point_id = sp1.stock_point_id
        LEFT JOIN stock_points sp2 ON rt.to_stock_point_id = sp2.stock_point_id
        LEFT JOIN account_details ad ON rt.from_user_id = ad.account_id
        WHERE rt.return_id = ?
    `;

    db.query(mainSql, [return_id], (err, mainResults) => {
        if (err) {
            console.error("Error fetching return details:", err);
            return callback(err);
        }
        
        if (mainResults.length === 0) {
            return callback(null, null);
        }

        const itemsSql = `
            SELECT * FROM return_to_main_stock_items
            WHERE return_id = ?
            ORDER BY item_id ASC
        `;

        db.query(itemsSql, [return_id], (itemsErr, itemsResults) => {
            if (itemsErr) {
                console.error("Error fetching return items:", itemsErr);
                return callback(itemsErr);
            }
            
            const result = {
                return_details: mainResults[0],
                return_items: itemsResults
            };
            
            callback(null, result);
        });
    });
};

// =============================================
// UPDATE: Update return transfer
// =============================================
exports.update = (return_id, status, remarks, callback) => {
    const sql = `
        UPDATE return_to_main_stock_transfers 
        SET status = ?, remarks = ?, updated_at = NOW()
        WHERE return_id = ?
    `;
    db.query(sql, [status, remarks, return_id], callback);
};

// =============================================
// DELETE: Delete return transfer
// =============================================
exports.delete = (return_id, callback) => {
    const deleteItemsSql = `DELETE FROM return_to_main_stock_items WHERE return_id = ?`;
    db.query(deleteItemsSql, [return_id], (err) => {
        if (err) return callback(err);
        
        const deleteReturnSql = `DELETE FROM return_to_main_stock_transfers WHERE return_id = ?`;
        db.query(deleteReturnSql, [return_id], callback);
    });
};

// =============================================
// UPDATE STATUS: Update transfer status
// =============================================
exports.updateStatus = (return_id, status, callback) => {
    const sql = `
        UPDATE return_to_main_stock_transfers 
        SET status = ?, updated_at = NOW()
        WHERE return_id = ?
    `;
    db.query(sql, [status, return_id], callback);
};

// =============================================
// GET LAST RETURN NUMBER
// =============================================
exports.getLastReturnNumber = (callback) => {
    const sql = `
        SELECT return_number FROM return_to_main_stock_transfers 
        ORDER BY return_id DESC 
        LIMIT 1
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching last return number:", err);
            return callback(err);
        }
        
        if (results.length === 0) {
            return callback(null, "RTN001");
        }
        
        const lastNumber = results[0].return_number;
        const match = lastNumber.match(/RTN(\d+)/);
        if (match) {
            const num = parseInt(match[1]) + 1;
            const newNumber = `RTN${String(num).padStart(3, '0')}`;
            callback(null, newNumber);
        } else {
            callback(null, "RTN001");
        }
    });
};

// =============================================
// UPDATE STOCK POINT: Update opening_tags_entry
// =============================================
exports.updateStockPointForReturn = (returnData, callback) => {
    if (!returnData || returnData.length === 0) {
        return callback(null, { message: "No products to update" });
    }

    let updatedCount = 0;
    let errorOccurred = false;

    // Process each product individually
    const updatePromises = returnData.map((item) => {
        return new Promise((resolve, reject) => {
            const productCode = item.PCode_BarCode;
            if (!productCode) {
                return resolve();
            }

            // IMPORTANT: When returning to main stock, we should NOT change the status
            // The status should remain as "Selected" and Received_Status as "pending"
            // Only update Stock_Point to MAIN STOCK ROOM and keep other values as they are
            
            // Get the current values from the database first to preserve them
            const getCurrentSql = `SELECT Status, Received_Status, user_id FROM opening_tags_entry WHERE PCode_BarCode = ?`;
            
            db.query(getCurrentSql, [productCode], (getErr, getResults) => {
                if (getErr) {
                    console.error(`Error getting current values for ${productCode}:`, getErr);
                    return reject(getErr);
                }
                
                if (getResults.length === 0) {
                    console.log(`Product ${productCode} not found`);
                    return resolve();
                }
                
                const currentStatus = getResults[0].Status || 'Selected';
                const currentReceivedStatus = getResults[0].Received_Status || 'pending';
                const currentUserId = getResults[0].user_id || null;
                
                // Only update Stock_Point, keep everything else as is
                // This preserves the "Selected" status and "pending" Received_Status
                const updateSql = `
                    UPDATE opening_tags_entry 
                    SET Stock_Point = ?
                    WHERE PCode_BarCode = ?
                `;

                const params = ['MAIN STOCK ROOM', productCode];

                db.query(updateSql, params, (updateErr, result) => {
                    if (updateErr) {
                        console.error(`Error updating product ${productCode}:`, updateErr);
                        errorOccurred = true;
                        return reject(updateErr);
                    }
                    if (result.affectedRows > 0) {
                        updatedCount++;
                    }
                    console.log(`Updated ${productCode}: Stock_Point='MAIN STOCK ROOM', Status='${currentStatus}', Received_Status='${currentReceivedStatus}'`);
                    resolve();
                });
            });
        });
    });

    // Execute all updates in parallel
    Promise.all(updatePromises)
        .then(() => {
            if (errorOccurred) {
                console.log("Some updates had errors, but continuing...");
            }
            callback(null, { updatedCount: updatedCount });
        })
        .catch((updateErr) => {
            console.error("Error updating stock points:", updateErr);
            callback(updateErr);
        });
};

// =============================================
// DELETE ASSIGNED RECORDS
// =============================================
exports.deleteAssignedRecords = (assignedIds, callback) => {
    if (!assignedIds || assignedIds.length === 0) {
        return callback(null, { deletedCount: 0 });
    }

    // First delete from assigned_salesman_items
    const deleteItemsSql = `DELETE FROM assigned_salesman_items WHERE assigned_id IN (?)`;
    
    db.query(deleteItemsSql, [assignedIds], (itemsErr, itemsResult) => {
        if (itemsErr) {
            console.error("Error deleting assigned items:", itemsErr);
            return callback(itemsErr);
        }
        
        // Then delete from assigned_salesman_transfers
        const deleteTransferSql = `DELETE FROM assigned_salesman_transfers WHERE assigned_id IN (?)`;
        
        db.query(deleteTransferSql, [assignedIds], (transferErr, transferResult) => {
            if (transferErr) {
                console.error("Error deleting assigned transfers:", transferErr);
                return callback(transferErr);
            }
            
            console.log(`Deleted ${itemsResult.affectedRows} items and ${transferResult.affectedRows} transfers`);
            callback(null, { 
                deletedCount: itemsResult.affectedRows + transferResult.affectedRows,
                itemsDeleted: itemsResult.affectedRows,
                transfersDeleted: transferResult.affectedRows
            });
        });
    });
};

// =============================================
// GET PRODUCTS BY STOCK POINT (for return)
// =============================================
exports.getProductsByStockPoint = (stock_point_name, callback) => {
    const sql = `
        SELECT 
            ote.opentag_id,
            ote.PCode_BarCode,
            ote.product_id,
            ote.product_Name,
            ote.sub_category,
            ote.metal_type,
            ote.Purity,
            ote.Gross_Weight,
            ote.Stones_Weight,
            ote.Weight_BW,
            ote.Stones_Price,
            ote.Wastage_On,
            ote.Wastage_Percentage,
            ote.WastageWeight,
            ote.TotalWeight_AW,
            ote.Making_Charges_On,
            ote.MC_Per_Gram,
            ote.Making_Charges,
            ote.rate,
            ote.total_price,
            ote.Pricing,
            ote.Status,
            ote.Stock_Point,
            ote.user_id,
            ote.image
        FROM opening_tags_entry ote
        WHERE ote.Stock_Point = ?
            AND ote.Status = 'Selected'
            AND ote.Received_Status = 'pending'
        ORDER BY ote.PCode_BarCode ASC
    `;
    
    db.query(sql, [stock_point_name], (err, results) => {
        if (err) {
            console.error("Error fetching products by stock point:", err);
            return callback(err);
        }
        callback(null, results);
    });
};