const db = require('../db');

// const addOrUpdateEntry = (product_id, pcs, gross_weight, callback) => {
//   // Ensure pcs and gross_weight are numbers
//   pcs = isNaN(Number(pcs)) ? 0 : Number(pcs);
//   gross_weight = isNaN(Number(gross_weight)) ? 0 : Number(gross_weight);

//   // Check if product_id exists in updated_values_table
//   const checkQuery = `SELECT COALESCE(pcs, 0) AS pcs, COALESCE(gross_weight, 0) AS gross_weight FROM updated_values_table WHERE product_id = ?`;

//   db.query(checkQuery, [product_id], (err, results) => {
//     if (err) {
//       console.error("Error checking updated_values_table:", err);
//       return callback(err, null);
//     }

//     if (results.length > 0) {
//       // If product_id exists, calculate the difference to update the product table
//       const existingData = results[0];
//       const diffPcs = pcs;
//       const diffGrossWeight = gross_weight;

//       const updatedPcs = Number(existingData.pcs) + pcs;
//       const updatedGrossWeight = Number(existingData.gross_weight) + gross_weight;

//       const updateQuery = `
//         UPDATE updated_values_table 
//         SET pcs = ?, gross_weight = ? 
//         WHERE product_id = ?
//       `;

//       db.query(updateQuery, [updatedPcs, updatedGrossWeight, product_id], (updateErr) => {
//         if (updateErr) {
//           console.error("Error updating updated_values_table:", updateErr);
//           return callback(updateErr, null);
//         }

//         // Update the product table with the differences
//         updateProductTable(product_id, diffPcs, diffGrossWeight, callback);
//       });
//     } else {
//       // Insert new entry into updated_values_table
//       const insertQuery = `
//         INSERT INTO updated_values_table (product_id, pcs, gross_weight) 
//         VALUES (?, ?, ?)
//       `;

//       db.query(insertQuery, [product_id, pcs, gross_weight], (insertErr, result) => {
//         if (insertErr) {
//           console.error("Error inserting into updated_values_table:", insertErr);
//           return callback(insertErr, null);
//         }

//         // Inserted for the first time, update product table directly
//         updateProductTable(product_id, pcs, gross_weight, callback);
//       });
//     }
//   });
// };

const updateProductTable = (product_id, diffPcs, diffGrossWeight, callback) => {
  const updateProductQuery = `
    UPDATE product 
    SET 
      pur_qty = COALESCE(pur_qty, 0) + ?,
      pur_weight = COALESCE(pur_weight, 0) + ?,
      avl_qty = COALESCE(avl_qty, 0) + ?,
      avl_weight = COALESCE(avl_weight, 0) + ?
    WHERE product_id = ?
  `;

  const updateBalanceFieldsQuery = `
    UPDATE product 
    SET 
      bal_qty = COALESCE(pur_qty, 0) - COALESCE(sale_qty, 0),
      bal_weight = COALESCE(pur_weight, 0) - COALESCE(sale_weight, 0)
    WHERE product_id = ?
  `;

  db.query(
    updateProductQuery, 
    [diffPcs, diffGrossWeight, diffPcs, diffGrossWeight, product_id], 
    (err, result) => {
      if (err) {
        console.error("Error updating product table:", err);
        return callback(err, null);
      }

      if (result.affectedRows === 0) {
        console.warn("No rows updated in product table. Check product_id existence.");
        return callback(null, { message: "Product ID not found in product table" });
      }

      // Update bal_qty and bal_weight after the first update
      db.query(
        updateBalanceFieldsQuery, 
        [product_id], 
        (balanceErr, balanceResult) => {
          if (balanceErr) {
            console.error("Error updating balance fields:", balanceErr);
            return callback(balanceErr, null);
          }

          if (balanceResult.affectedRows === 0) {
            console.warn("No rows updated in balance fields. Check product_id existence.");
            return callback(null, { message: "Balance fields not updated. Product ID not found in product table" });
          }

          callback(null, { message: "Product table and balance fields updated successfully" });
        }
      );
    }
  );
};

// const updateEntryBySubtraction = (product_id, pcs, gross_weight) => {
//   return new Promise((resolve, reject) => {
//     const query1 = `
//       UPDATE updated_values_table
//       SET pcs = GREATEST(pcs - ?, 0), gross_weight = GREATEST(gross_weight - ?, 0)
//       WHERE product_id = ?
//     `;

//     const query2 = `
//       UPDATE product
//       SET pur_qty = GREATEST(pur_qty - ?, 0), pur_weight = GREATEST(pur_weight - ?, 0),
//       avl_qty = GREATEST(avl_qty - ?, 0), avl_weight = GREATEST(avl_weight - ?, 0)
//       WHERE product_id = ?
//     `;

//     const query3 = `
//     UPDATE product
//     SET 
//       bal_qty = pur_qty - COALESCE(sale_qty, 0),
//       bal_weight = pur_weight - COALESCE(sale_weight, 0)
//     WHERE product_id = ?
//   `;

//     // Start by updating updated_values_table
//     db.query(query1, [pcs, gross_weight, product_id], (err, result) => {
//       if (err) {
//         return reject(err);
//       }

//       // Proceed to update the product table if successful
//       db.query(query2, [pcs, gross_weight, pcs, gross_weight, product_id], (err2, result2) => {
//         if (err2) {
//           return reject(err2);
//         }

//         // Update bal_qty and bal_weight after the second query
//         db.query(query3, [product_id], (err3, result3) => {
//           if (err3) {
//             return reject(err3);
//           }
//           resolve({ message: "All updates completed successfully", result3 });
//         });
//       });
//     });
//   });
// };



const addEntry = (data, callback) => {
  const { product_id, pcs, gross_weight, bal_pcs, bal_gross_weight, tag_id } = data;

  const query = `
    INSERT INTO updated_values_table (product_id, pcs, gross_weight, bal_pcs, bal_gross_weight, tag_id)
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(query, [product_id, pcs, gross_weight, bal_pcs, bal_gross_weight, tag_id], callback);
};

const getEntryByTagAndProduct = (tag_id, product_id, callback) => {
  const query = `
    SELECT pcs, gross_weight, bal_pcs, bal_gross_weight
    FROM updated_values_table
    WHERE tag_id = ? AND product_id = ?`;

  db.query(query, [tag_id, product_id], callback);
};

const updateEntry = (data, callback) => {
  const { product_id, pcs, gross_weight, bal_pcs, bal_gross_weight, tag_id } = data;

  const query = `
    UPDATE updated_values_table
    SET pcs = ?, gross_weight = ?, bal_pcs = ?, bal_gross_weight = ?
    WHERE tag_id = ? AND product_id = ?`;

  db.query(query, [pcs, gross_weight, bal_pcs, bal_gross_weight, tag_id, product_id], callback);
};

const getEntryById = (productId, tagId, callback) => {
  const sql = `SELECT * FROM updated_values_table WHERE product_id = ? AND tag_id = ?`;
  db.query(sql, [productId, tagId], callback);
};

const deleteEntry = (tag_id, product_id, callback) => {
  const query = "DELETE FROM updated_values_table WHERE tag_id = ? AND product_id = ?";
  
  db.query(query, [tag_id, product_id], (err, result) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
};


const getBalanceByProductAndTag = (product_id, tag_id, callback) => {
  const query = `
    SELECT bal_pcs, bal_gross_weight 
    FROM updated_values_table 
    WHERE product_id = ? AND tag_id = ?`;

  db.query(query, [product_id, tag_id], (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results.length > 0 ? results[0] : null);
  });
};
  
  module.exports = { addEntry, getEntryByTagAndProduct,updateEntry, getEntryById,deleteEntry,  getBalanceByProductAndTag}