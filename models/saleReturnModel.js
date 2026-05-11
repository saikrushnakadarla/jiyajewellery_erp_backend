const db = require('../db');

const updateRepairDetails = async (updates) => {
  for (const update of updates) {
    await db.promise().query(
      "UPDATE repair_details SET status = ? WHERE id = ?",
      [update.status, update.id]
    );
  }
};

const updateOpenTags = async (updates) => {
  for (const update of updates) {
    await db.promise().query(
      "UPDATE opening_tags_entry SET Status = ? WHERE PCode_BarCode = ?",
      [update.Status, update.PCode_BarCode]
    );
  }
};

const addAvailableEntry = async (codes) => {
  for (const code of codes) {
    await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM opening_tags_entry WHERE PCode_BarCode = ?",
        [code],
        (err, results) => {
          if (err) {
            console.error(`Error fetching entries for code ${code}:`, err.message);
            return reject(err);
          }

          if (results.length > 0) {
            const matchedEntry = results[0];

            // Extract the prefix from the PCode_BarCode (e.g., 'RR' from 'RR002')
            const prefix = matchedEntry.Prefix;
            const numberRegex = /(\d+)$/; // Regex to extract number from PCode_BarCode

            // Query the highest PCode_BarCode for the same prefix
            db.query(
              "SELECT MAX(PCode_BarCode) AS max_code FROM opening_tags_entry WHERE PCode_BarCode LIKE ?",
              [prefix + '%'],
              (err, maxResult) => {
                if (err) {
                  console.error('Error fetching max code:', err.message);
                  return reject(err);
                }

                const maxCode = maxResult[0].max_code;
                let newCode = prefix + '001'; // Default new code if no max code found

                if (maxCode) {
                  const match = maxCode.match(numberRegex);
                  if (match && match[1]) {
                    // Increment the numeric part of the PCode_BarCode
                    const newNumber = (parseInt(match[1], 10) + 1).toString().padStart(3, '0');
                    newCode = prefix + newNumber;
                  }
                }

                // Insert the new entry with the newly generated PCode_BarCode
                db.query(
                  `INSERT INTO opening_tags_entry (
                      product_id, 
                      subcategory_id, 
                      sub_category, 
                      Pricing, 
                      Tag_ID, 
                      Prefix, 
                      category, 
                      Purity, 
                      metal_type, 
                      PCode_BarCode, 
                      Gross_Weight, 
                      Stones_Weight, 
                      Stones_Price, 
                      WastageWeight, 
                      HUID_No, 
                      Wastage_On, 
                      Wastage_Percentage, 
                      Weight_BW, 
                      MC_Per_Gram, 
                      Making_Charges_On, 
                      TotalWeight_AW, 
                      Making_Charges, 
                      Status, 
                      Source, 
                      Stock_Point, 
                      making_on, 
                      dropdown, 
                      selling_price, 
                      design_master, 
                      product_Name
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    matchedEntry.product_id,
                    matchedEntry.subcategory_id,
                    matchedEntry.sub_category,
                    matchedEntry.Pricing,
                    matchedEntry.Tag_ID,
                    matchedEntry.Prefix,
                    matchedEntry.category,
                    matchedEntry.Purity,
                    matchedEntry.metal_type,
                    newCode,  // New PCode_BarCode with incremented number
                    matchedEntry.Gross_Weight,
                    matchedEntry.Stones_Weight,
                    matchedEntry.Stones_Price,
                    matchedEntry.WastageWeight,
                    matchedEntry.HUID_No,
                    matchedEntry.Wastage_On,
                    matchedEntry.Wastage_Percentage,
                    matchedEntry.Weight_BW,
                    matchedEntry.MC_Per_Gram,
                    matchedEntry.Making_Charges_On,
                    matchedEntry.TotalWeight_AW,
                    matchedEntry.Making_Charges,
                    "Available", // Status is always "Available"
                    matchedEntry.Source,
                    matchedEntry.Stock_Point,
                    matchedEntry.making_on,
                    matchedEntry.dropdown,
                    matchedEntry.selling_price,
                    matchedEntry.design_master,
                    matchedEntry.product_Name
                  ],
                  (insertErr) => {
                    if (insertErr) {
                      // console.error(`Error inserting entry for code ${code}:`, insertErr.message);
                      return reject(insertErr);
                    }
                    // console.log(`Entry successfully added for code ${newCode}`);
                    resolve(); // Resolve after successful insert
                  }
                );
              }
            );
          } else {
            console.warn(`No matched entries found for code: ${code}`);
            resolve(); // Resolve if no entries found
          }
        }
      );
    });
  }
};

const updateProduct = async (updates) => {
  for (const update of updates) {
    const { product_id, qty, gross_weight } = update;

    const [results] = await db.promise().query(
      "SELECT salereturn_qty, salereturn_weight FROM product WHERE product_id = ?",
      [product_id]
    );

    if (results.length > 0) {
      const product = results[0];

      // Ensure numeric values, handling null cases properly
      const currentQty = Number(product.salereturn_qty) || 0;
      const currentWeight = Number(product.salereturn_weight) || 0;
      const newQty = currentQty + (Number(qty) || 0);
      const newWeight = currentWeight + (Number(gross_weight) || 0); // Convert gross_weight to number

      await db.promise().query(
        "UPDATE product SET salereturn_qty = ?, salereturn_weight = ? WHERE product_id = ?",
        [newQty, newWeight.toFixed(2), product_id] // Ensure decimal format
      );
    }
  }
};




module.exports = { updateRepairDetails, updateOpenTags, addAvailableEntry, updateProduct };
