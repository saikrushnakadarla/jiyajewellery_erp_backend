const db = require("../db");

// =============================================
// INSERT: Save return to main stock with capture image, packet_barcode, capture_weight_of_bag, and barcode_status
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
    capture_image = null,
    capture_weight_of_bag = 0, // NEW
    callback
) => {
    if (typeof from_user_id === 'function') {
        callback = from_user_id;
        from_user_id = null;
        to_user_id = null;
        capture_image = null;
        capture_weight_of_bag = 0;
    }
    if (typeof to_user_id === 'function' && callback) {
        callback = to_user_id;
        to_user_id = null;
        capture_image = null;
        capture_weight_of_bag = 0;
    }
    if (typeof capture_image === 'function' && callback) {
        callback = capture_image;
        capture_image = null;
        capture_weight_of_bag = 0;
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

    // ===== CALCULATE TOTAL WEIGHT MACHINE READINGS =====
    let totalWeightMachineReading = 0;
    let totalWeightMachineGrams = 0;
    let totalWeightMachineMilligrams = 0;
    let totalWeightMachineConfidence = 0;
    let hasWeightData = false;
    let latestWeightExtractedAt = null;
    let packetBarcodeFromItems = null;
    
    // ===== CRITICAL FIX: Always set to 'Unselected' at transfer level =====
    const overallBarcodeStatus = 'Unselected';

    return_data.forEach(item => {
        totalQuantity += parseFloat(item.qty) || 0;
        totalGrossWeight += parseFloat(item.gross_weight) || 0;
        totalNetWeight += parseFloat(item.net_weight) || 0;

        // Capture packet_barcode from first item that has one
        if (!packetBarcodeFromItems && item.packet_barcode) {
            packetBarcodeFromItems = item.packet_barcode;
        }

        // Sum weight machine readings (or use first valid)
        const weightReading = parseFloat(item.weight_machine_reading) || 0;
        if (weightReading > 0) {
            totalWeightMachineReading = weightReading; // Use first valid weight as total
            totalWeightMachineGrams = parseInt(item.weight_machine_grams) || 0;
            totalWeightMachineMilligrams = parseInt(item.weight_machine_milligrams) || 0;
            totalWeightMachineConfidence = parseInt(item.weight_machine_confidence) || 0;
            hasWeightData = true;
            latestWeightExtractedAt = new Date();
        }
    });

    const avgWeightMachineConfidence = totalItems > 0 && hasWeightData
        ? Math.round(totalWeightMachineConfidence / totalItems)
        : 0;

    // Insert main return record with capture_image, packet_barcode, barcode_status, capture_weight_of_bag, and weight fields
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
            packet_barcode,
            barcode_status,
            created_by,
            weight_machine_reading,
            weight_machine_grams,
            weight_machine_milligrams,
            weight_machine_confidence,
            weight_machine_raw,
            weight_extracted_at,
            capture_weight_of_bag, -- NEW
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
        capture_image || null,
        packetBarcodeFromItems || null,
        overallBarcodeStatus,
        created_by || null,
        totalWeightMachineReading || 0,
        totalWeightMachineGrams || 0,
        totalWeightMachineMilligrams || 0,
        avgWeightMachineConfidence || 0,
        hasWeightData ? `Total: ${totalWeightMachineReading}g` : null,
        latestWeightExtractedAt,
        parseFloat(capture_weight_of_bag) || 0, // NEW
    ];

    db.query(insertReturnSql, returnParams, (err, returnResult) => {
        if (err) {
            console.error("Error inserting return transfer:", err);
            return callback(err);
        }

        const returnId = returnResult.insertId;

        // Insert items with all fields including weight fields and barcode_status
        const insertItemsSql = `
            INSERT INTO return_to_main_stock_items (
                return_id,
                assigned_item_id,
                product_id,
                PCode_BarCode,
                packet_barcode,
                barcode_status,
                product_name,
                metal_type,
                purity,
                category,
                sub_category,
                design_name,
                qty,
                gross_weight,
                cover_wt,
                card_wt,
                packing_wt,
                stone_weight,
                net_weight,
                rate,
                making_charges,
                stone_price,
                total_price,
                image,
                remarks,
                weight_machine_reading,
                weight_machine_grams,
                weight_machine_milligrams,
                weight_machine_confidence,
                weight_machine_raw,
                weight_extracted_at,
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

            const packetBarcode = item.packet_barcode || null;
            // ===== CRITICAL FIX: Always set barcode_status to 'Unselected' =====
            const barcodeStatus = 'Unselected';
            
            const weightReading = parseFloat(item.weight_machine_reading) || 0;
            const weightExtractedAt = weightReading > 0 ? new Date() : null;

            return [
                returnId,
                item.item_id || null,
                item.product_id || null,
                item.PCode_BarCode || null,
                packetBarcode,
                barcodeStatus,
                item.product_name || null,
                item.metal_type || null,
                item.purity || null,
                item.category || null,
                item.sub_category || null,
                item.design_name || null,
                parseFloat(item.qty) || 0,
                parseFloat(item.gross_weight) || 0,
                parseFloat(item.cover_wt) || 0,
                parseFloat(item.card_wt) || 0,
                parseFloat(item.packing_wt) || 0,
                parseFloat(item.stone_weight) || 0,
                parseFloat(item.net_weight) || 0,
                parseFloat(item.rate) || 0,
                parseFloat(item.making_charges) || 0,
                parseFloat(item.stone_price) || 0,
                parseFloat(item.total_price) || 0,
                imagePath,
                item.remarks || null,
                weightReading,
                parseInt(item.weight_machine_grams) || 0,
                parseInt(item.weight_machine_milligrams) || 0,
                parseInt(item.weight_machine_confidence) || 0,
                item.weight_machine_raw || null,
                weightExtractedAt,
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
            console.log(`📦 Packet barcode: ${packetBarcodeFromItems || 'None'}`);
            console.log(`📊 Overall barcode status: ${overallBarcodeStatus} (FIXED: Always Unselected)`);
            console.log(`📊 Item barcode status: Always Unselected (FIXED)`);
            console.log(`⚖️ Total weight reading: ${totalWeightMachineReading}g`);
            console.log(`📦 Capture Weight of Bag: ${parseFloat(capture_weight_of_bag) || 0}g`);
            callback(null, { return_id: returnId, return_number: return_number });
        });
    });
};


// =============================================
// GET ALL: Get all return transfers with packet_barcode and barcode_status
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
            rt.packet_barcode,
            rt.barcode_status,
            rt.created_by,
            rt.created_at,
            rt.updated_at,
            rt.weight_machine_reading,
            rt.weight_machine_grams,
            rt.weight_machine_milligrams,
            rt.weight_machine_confidence,
            rt.weight_machine_raw,
            rt.weight_extracted_at,
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
// GET BY ID: Get return transfer by ID with packet_barcode and barcode_status
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
            rt.packet_barcode,
            rt.barcode_status,
            rt.created_by,
            rt.created_at,
            rt.updated_at,
            rt.weight_machine_reading,
            rt.weight_machine_grams,
            rt.weight_machine_milligrams,
            rt.weight_machine_confidence,
            rt.weight_machine_raw,
            rt.weight_extracted_at,
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
            SELECT 
                item_id,
                return_id,
                assigned_item_id,
                product_id,
                PCode_BarCode,
                packet_barcode,
                barcode_status,
                product_name,
                metal_type,
                purity,
                category,
                sub_category,
                design_name,
                qty,
                gross_weight,
                cover_wt,
                card_wt,
                packing_wt,
                stone_weight,
                net_weight,
                rate,
                making_charges,
                stone_price,
                total_price,
                image,
                remarks,
                weight_machine_reading,
                weight_machine_grams,
                weight_machine_milligrams,
                weight_machine_confidence,
                weight_machine_raw,
                weight_extracted_at,
                created_at
            FROM return_to_main_stock_items
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
            ote.image,
            ote.Cover_Wt,
            ote.Card_Wt,
            ote.Packing_Wt
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

// ==================== UPDATE WEIGHT FOR ITEM ====================
exports.updateItemWeight = (item_id, weightData, callback) => {
    const { 
        total_grams, 
        grams, 
        milligrams, 
        raw_text, 
        confidence 
    } = weightData;

    const sql = `
        UPDATE return_to_main_stock_items 
        SET 
            weight_machine_reading = ?,
            weight_machine_grams = ?,
            weight_machine_milligrams = ?,
            weight_machine_confidence = ?,
            weight_machine_raw = ?,
            weight_extracted_at = NOW()
        WHERE item_id = ?
    `;

    const params = [
        total_grams || 0,
        grams || 0,
        milligrams || 0,
        confidence || 100,
        raw_text || null,
        item_id
    ];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Error updating item weight:", err);
            return callback(err);
        }
        callback(null, { success: true, affectedRows: result.affectedRows });
    });
};

// ==================== GET ITEM WEIGHT ====================
exports.getItemWeight = (item_id, callback) => {
    const sql = `
        SELECT 
            item_id,
            weight_machine_reading,
            weight_machine_grams,
            weight_machine_milligrams,
            weight_machine_confidence,
            weight_machine_raw,
            weight_extracted_at
        FROM return_to_main_stock_items 
        WHERE item_id = ?
    `;
    db.query(sql, [item_id], callback);
};

// ==================== GET ALL ITEMS WITH WEIGHT FOR RETURN ====================
exports.getItemsWithWeightsByReturn = (return_id, callback) => {
    const sql = `
        SELECT 
            item_id,
            product_id,
            PCode_BarCode,
            packet_barcode,
            barcode_status,
            product_name,
            gross_weight,
            weight_machine_reading,
            weight_machine_grams,
            weight_machine_milligrams,
            weight_machine_confidence,
            weight_machine_raw,
            weight_extracted_at
        FROM return_to_main_stock_items 
        WHERE return_id = ?
        ORDER BY item_id ASC
    `;
    db.query(sql, [return_id], callback);
};

// ==================== GET ITEMS BY BARCODE STATUS ====================
exports.getItemsByBarcodeStatus = (status, callback) => {
    const sql = `
        SELECT 
            ri.*,
            rt.return_number,
            rt.return_date,
            rt.from_stock_point_id,
            rt.from_user_id,
            rt.barcode_status as transfer_barcode_status
        FROM return_to_main_stock_items ri
        LEFT JOIN return_to_main_stock_transfers rt ON ri.return_id = rt.return_id
        WHERE ri.barcode_status = ?
        ORDER BY ri.created_at DESC
    `;
    db.query(sql, [status], callback);
};

// ==================== GET ITEMS WITH PACKET BARCODE ====================
exports.getItemsWithPacketBarcode = (packet_barcode, callback) => {
    const sql = `
        SELECT 
            ri.*,
            rt.return_number,
            rt.return_date,
            rt.from_stock_point_id,
            rt.from_user_id,
            rt.barcode_status as transfer_barcode_status
        FROM return_to_main_stock_items ri
        LEFT JOIN return_to_main_stock_transfers rt ON ri.return_id = rt.return_id
        WHERE ri.packet_barcode = ?
        ORDER BY ri.created_at DESC
    `;
    db.query(sql, [packet_barcode], callback);
};

// =============================================
// PACKET BARCODE FUNCTIONS FOR RETURN TO MAIN STOCK
// =============================================

// Search packet by QR code/barcode
// Search packet by QR code/barcode
exports.searchPacketByQRCode = (qrCode, callback) => {
    // Try multiple search methods:
    // 1. Direct match on qr_code column (JSON string)
    // 2. JSON contains the barcode
    // 3. Concatenation of prefix + qr_number matches
    const sql = `
        SELECT 
            id, 
            prefix, 
            packet_wt, 
            qr_code, 
            status, 
            created_at, 
            updated_at 
        FROM qr_packets 
        WHERE qr_code = ? 
           OR qr_code LIKE ?
           OR CONCAT(prefix, qr_number) = ?
           OR prefix = ? AND qr_number = ?
        ORDER BY id DESC 
        LIMIT 1
    `;
    
    const searchPattern = `%"qr_code":"${qrCode}"%`;
    
    // Extract prefix and number if possible
    let prefix = null;
    let number = null;
    const prefixMatch = qrCode.match(/^([A-Z]+)/);
    const numberMatch = qrCode.match(/(\d+)$/);
    if (prefixMatch) prefix = prefixMatch[1];
    if (numberMatch) number = numberMatch[1];
    
    db.query(
        sql, 
        [qrCode, searchPattern, qrCode, prefix, number], 
        (err, results) => {
            if (err) {
                console.error("Error searching packet by QR code:", err);
                return callback(err);
            }
            
            if (results.length === 0) {
                return callback(null, null);
            }
            
            callback(null, results[0]);
        }
    );
};

// Create new packet
exports.createPacket = (packetData, callback) => {
    const { prefix, packet_wt, qr_code, status = 'Active' } = packetData;
    
    const sql = `
        INSERT INTO qr_packets (
            prefix, 
            packet_wt, 
            qr_code, 
            status, 
            created_at, 
            updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    db.query(sql, [prefix, packet_wt, qr_code, status], (err, result) => {
        if (err) {
            console.error("Error creating packet:", err);
            return callback(err);
        }
        
        callback(null, result);
    });
};

// Update packet status
exports.updatePacketStatus = (id, status, callback) => {
    const sql = `
        UPDATE qr_packets 
        SET status = ?, updated_at = NOW() 
        WHERE id = ?
    `;
    
    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error("Error updating packet status:", err);
            return callback(err);
        }
        
        callback(null, result);
    });
};

// Get all packets
exports.getAllPackets = (callback) => {
    const sql = `
        SELECT 
            id, 
            prefix, 
            packet_wt, 
            qr_code, 
            status, 
            created_at, 
            updated_at 
        FROM qr_packets 
        ORDER BY created_at DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching all packets:", err);
            return callback(err);
        }
        
        callback(null, results);
    });
};