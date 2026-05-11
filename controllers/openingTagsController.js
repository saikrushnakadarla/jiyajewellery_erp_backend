const openingTagsModel = require('../models/openingTagsModel');
const moment = require('moment');
const db = require('../db');
const fs = require("fs");
const path = require("path");

const createOpeningTag = (req, res) => {
    const {
        tag_id,
        product_id,
        account_name,
        invoice,
        Pricing,
        cut,
        color,
        clarity,
        // Tag_ID,
        subcategory_id,
        sub_category,
        design_master,
        Prefix = "",
        category = "",
        Purity = "",
        metal_type = "",
        PCode_BarCode = "",
        Gross_Weight = 0,
        Stones_Weight = 0,
        deduct_st_Wt = 0,
        Stones_Price = 0,
        WastageWeight,
        HUID_No = "N/A",
        Wastage_On,
        Wastage_Percentage = 0,
        Weight_BW = 0,
        MC_Per_Gram = 0,
        Making_Charges_On = 0,
        TotalWeight_AW = 0,
        Making_Charges = 0,
        rate = 0,
        tax = 0,
        tax_amt = 0,
        total_price = 0,
        Status = "Available",
        Source = "",
        Stock_Point = "",
        pieace_cost = "",
        Design_Master = "",
        product_Name = "",
        making_on = "",
        selling_price = "",
        dropdown = "",
        qr_status = "No",
        stone_price_per_carat = 0,
        pur_rate_cut = 0,
        pur_Purity = 0,
        pur_purityPercentage = 0,
        pur_Gross_Weight = 0,
        pur_Stones_Weight = 0,
        pur_deduct_st_Wt = 0,
        pur_stone_price_per_carat = 0,
        pur_Stones_Price = 0,
        pur_Weight_BW = 0,
        pur_Making_Charges_On = "",
        pur_MC_Per_Gram = 0,
        pur_Making_Charges = 0,
        pur_Wastage_On = "",
        pur_Wastage_Percentage = 0,
        pur_WastageWeight = 0,
        pur_TotalWeight_AW = 0,
        size,
        tag_weight,
        pcs,
        image,
        tax_percent,
        mrp_price,
        total_pcs_cost,
        printing_purity
    } = req.body;

    const productImage = req.file ? req.file.filename : null;

    const sanitizeValue = (value, defaultValue = 0) => {
        return value === "" || value === null || value === undefined ? defaultValue : value;
    };


    const data = {
        tag_id,
        product_id,
        account_name,
        invoice,
        Pricing,
        cut,
        color,
        clarity,
        // Tag_ID,
        subcategory_id,
        sub_category,
        design_master,
        Prefix,
        category,
        Purity,
        metal_type,
        PCode_BarCode,
        Gross_Weight: sanitizeValue(Gross_Weight),
        Stones_Weight: sanitizeValue(Stones_Weight),
        deduct_st_Wt: sanitizeValue(deduct_st_Wt),
        Stones_Price: sanitizeValue(Stones_Price),
        WastageWeight: sanitizeValue(WastageWeight),
        HUID_No,
        Wastage_On,
        Wastage_Percentage: sanitizeValue(Wastage_Percentage),
        Weight_BW: sanitizeValue(Weight_BW),
        MC_Per_Gram: sanitizeValue(MC_Per_Gram),
        Making_Charges_On: sanitizeValue(Making_Charges_On),
        TotalWeight_AW: sanitizeValue(TotalWeight_AW),
        Making_Charges: sanitizeValue(Making_Charges),
        rate: sanitizeValue(rate, null),
        tax: sanitizeValue(tax, null),
        tax_amt: sanitizeValue(tax_amt, null),
        total_price: sanitizeValue(total_price, null),
        Status,
        Source,
        Stock_Point,
        pieace_cost: sanitizeValue(pieace_cost),
        product_Name,
        making_on,
        selling_price: sanitizeValue(selling_price),
        dropdown,
        qr_status,
        productImage,
        stone_price_per_carat: sanitizeValue(stone_price_per_carat),
        pur_rate_cut: sanitizeValue(pur_rate_cut),
        pur_Purity: sanitizeValue(pur_Purity),
        pur_purityPercentage: sanitizeValue(pur_purityPercentage),
        pur_Gross_Weight: sanitizeValue(pur_Gross_Weight),
        pur_Stones_Weight: sanitizeValue(pur_Stones_Weight),
        pur_deduct_st_Wt: sanitizeValue(pur_deduct_st_Wt),
        pur_stone_price_per_carat: sanitizeValue(pur_stone_price_per_carat),
        pur_Stones_Price: sanitizeValue(pur_Stones_Price),
        pur_Weight_BW: sanitizeValue(pur_Weight_BW),
        pur_Making_Charges_On: sanitizeValue(pur_Making_Charges_On),
        pur_MC_Per_Gram: sanitizeValue(pur_MC_Per_Gram),
        pur_Making_Charges: sanitizeValue(pur_Making_Charges),
        pur_Wastage_On: sanitizeValue(pur_Wastage_On),
        pur_Wastage_Percentage: sanitizeValue(pur_Wastage_Percentage),
        pur_WastageWeight: sanitizeValue(pur_WastageWeight),
        pur_TotalWeight_AW: sanitizeValue(pur_TotalWeight_AW),
        size: sanitizeValue(size),
        tag_weight: sanitizeValue(tag_weight),
        pcs: sanitizeValue(pcs),
        image,
        tax_percent: sanitizeValue(tax_percent),
        mrp_price: sanitizeValue(mrp_price),
        total_pcs_cost: sanitizeValue(total_pcs_cost),
        printing_purity: sanitizeValue(printing_purity),
    };


    openingTagsModel.addOpeningTag(data, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database insertion failed", details: err });
        }
        res.status(200).json({ message: "Data inserted successfully", result });
    });
};

const getOpeningTags = (req, res) => {
    openingTagsModel.getAllOpeningTags((err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database query failed", details: err });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "No data found" });
        }
        res.status(200).json({ message: "Data retrieved successfully", result });
    });
};

const updateOpeningTag = (req, res) => {
    const { id } = req.params;
    let updatedData = req.body;

    // Handle empty strings for fields that expect decimals
    if (updatedData.Making_Charges === '') {
        updatedData.Making_Charges = null;  // Set to null or appropriate default value
    }

    // Convert 'date' field to MySQL-compatible format if it exists
    if (updatedData.date) {
        updatedData.date = moment(updatedData.date).format('YYYY-MM-DD HH:mm:ss');
    }

    // Step 1: Fetch the current `product_id` and `Gross_Weight` from `opening_tags_entry`
    const getOpeningTagQuery = `SELECT product_id, tag_id, Gross_Weight FROM opening_tags_entry WHERE opentag_id = ?`;

    db.query(getOpeningTagQuery, [id], (err, result) => {
        if (err) {
            console.error("Database error fetching opening tag:", err);
            return res.status(500).json({ error: "Failed to fetch opening tag", details: err });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "Record not found" });
        }

        const { product_id, tag_id, Gross_Weight: oldGrossWeight } = result[0];  // Old Gross Weight from DB
        const newGrossWeight = updatedData.Gross_Weight;  // New Gross Weight from Request

        // Step 2: Update `updated_values_table`
        const updateValuesQuery = `
            UPDATE updated_values_table 
            SET bal_gross_weight = bal_gross_weight + ? - ? 
            WHERE product_id = ? AND tag_id = ?`;

        db.query(updateValuesQuery, [oldGrossWeight, newGrossWeight, product_id, tag_id,], (err, updateResult) => {
            if (err) {
                console.error("Database error updating values table:", err);
                return res.status(500).json({ error: "Failed to update updated_values_table", details: err });
            }

            // Step 3: Update `opening_tags_entry` with new values
            openingTagsModel.updateOpeningTag(id, updatedData, (err, updateTagResult) => {
                if (err) {
                    console.error("Database error updating opening tag:", err);
                    return res.status(500).json({ error: "Database update failed", details: err });
                }
                if (updateTagResult.affectedRows === 0) {
                    return res.status(404).json({ message: "Record not found" });
                }
                res.status(200).json({ message: "Data updated successfully" });
            });
        });
    });
};

const deleteOpeningTag = (req, res) => {
    const { opentag_id } = req.params;
    const id = parseInt(opentag_id, 10);

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID received" });
    }

    // Fetch record — include PCode_BarCode
    const getOpeningTagQuery = `
        SELECT product_id, tag_id, Gross_Weight, PCode_BarCode 
        FROM opening_tags_entry 
        WHERE opentag_id = ?
    `;

    db.query(getOpeningTagQuery, [id], (err, result) => {
        if (err) {
            console.error("Database error fetching opening tag:", err);
            return res.status(500).json({ error: "Database error while fetching opening tag", details: err });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: "Record not found" });
        }

        const { product_id, tag_id, Gross_Weight, PCode_BarCode } = result[0];

        const formattedTagId = typeof tag_id === "number" ? tag_id.toString() : tag_id;
        const formattedProductId = parseInt(product_id, 10);

        if (isNaN(formattedProductId)) {
            return res.status(400).json({ error: "Invalid product_id" });
        }

        // 1️⃣ Update values table
        const updateValuesQuery = `
            UPDATE updated_values_table 
            SET bal_gross_weight = bal_gross_weight + ?, bal_pcs = bal_pcs + 1 
            WHERE product_id = ? AND tag_id = CAST(? AS CHAR)
        `;

        db.query(updateValuesQuery, [Gross_Weight, formattedProductId, formattedTagId], (err) => {
            if (err) {
                console.error("Database error updating values table:", err);
                return res.status(500).json({ error: "Database error updating values table", details: err });
            }

            // 2️⃣ Delete the invoice file (if exists)
            if (PCode_BarCode) {
                const filePath = path.join(__dirname, "../uploads/invoices", `${PCode_BarCode}.pdf`);

                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr && unlinkErr.code !== "ENOENT") {
                        console.error("Error deleting invoice PDF:", unlinkErr);
                    }
                });
            }

            // 3️⃣ Delete DB record
            const deleteQuery = `DELETE FROM opening_tags_entry WHERE opentag_id = ?`;

            db.query(deleteQuery, [id], (err, deleteResult) => {
                if (err) {
                    console.error("Database error deleting opening tag:", err);
                    return res.status(500).json({ error: "Database error while deleting opening tag", details: err });
                }
                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ message: "No record found to delete" });
                }

                return res.status(200).json({ message: "Opening tag deleted successfully" });
            });
        });
    });
};

const createSubcategory = (req, res) => {
    const { category_id, sub_category_name, category, prefix, metal_type, purity, selling_purity, printing_purity } = req.body;

    openingTagsModel.Subcategory.create(category_id, sub_category_name, category, prefix, metal_type, purity, selling_purity, printing_purity, (err, results) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).json({ message: 'Error inserting data' });
        }
        return res.status(201).json({ message: 'Subcategory created successfully', subcategory_id: results.insertId });
    });
};

const getAllSubcategories = (req, res) => {
    openingTagsModel.Subcategory.getAll((err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ message: 'Error fetching data' });
        }
        return res.status(200).json(results);
    });
};

const getSubcategoryById = (req, res) => {
    const subcategoryId = req.params.id;

    openingTagsModel.Subcategory.getById(subcategoryId, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ message: 'Error fetching data' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }
        return res.status(200).json(results[0]);
    });
};

const getLastPcode = (req, res) => {
    openingTagsModel.getLastPcode((err, result) => {
        if (err) {
            console.error("Error fetching last PCode_BarCode:", err);
            return res.status(500).json({ error: "Failed to fetch last PCode_BarCode" });
        }

        // Ensure result has data
        if (result && result.length > 0) {
            // Extract rbarcode values that start with "RB"
            const PCode_BarCode = result
                .map(row => row.PCode_BarCode) // Extract rbarcode from each row
                .filter(product => product && product.startsWith("0")) // Filter only valid RB numbers
                .map(product => parseInt(product.slice(2), 10)) // Extract the numeric part of rbarcode
                .filter(number => !isNaN(number)); // Ensure numeric parsing was successful

            if (PCode_BarCode.length > 0) {
                // Find the maximum rbarcode number and increment it
                const lastPCode_BarCode = Math.max(...PCode_BarCode);
                const nextPCode_BarCode = `0${String(lastPCode_BarCode + 1).padStart(3, "0")}`;
                return res.json({ lastPCode_BarCode: nextPCode_BarCode });
            }
        }

        // Default if no valid RB numbers are found
        res.json({ lastPCode_BarCode: "001" });
    });
};

const getNextPCodeBarCode = (req, res) => {
    const { prefix } = req.query;

    if (!prefix) {
        return res.status(400).json({ error: "Prefix is required" });
    }

    openingTagsModel.getLastPCodeBarCode(prefix, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database query failed", details: err });
        }

        let nextCode;
        if (results.length > 0) {
            const lastCode = results[0].PCode_BarCode;
            const numericPart = parseInt(lastCode.slice(prefix.length)) || 0; // Extract numeric part
            nextCode = `${prefix}${String(numericPart + 1).padStart(3, '0')}`; // Increment and format
        } else {
            nextCode = `${prefix}001`; // Start fresh if no entries found
        }

        res.status(200).json({ nextPCodeBarCode: nextCode });
    });
};

module.exports = {
    createSubcategory,
    getAllSubcategories,
    getSubcategoryById,
    createOpeningTag,
    getOpeningTags,
    updateOpeningTag,
    getLastPcode,
    getNextPCodeBarCode,
    deleteOpeningTag,
};
