const { addEntry, getEntryByTagAndProduct,updateEntry, getBalanceByProductAndTag, getEntryById, deleteEntry } = require('../models/updateValuesModel');
const db = require('../db');

// const addEntryHandler = (req, res) => {
//     const { product_id, pcs, gross_weight } = req.body;

//     if (!product_id || !pcs || !gross_weight) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     // Call the model function to add or update the entry
//     addOrUpdateEntry(product_id, pcs, gross_weight, (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ error: 'Database error' });
//       }

//       return res.status(200).json(result);
//     });
//   };

// const deleteUpdatedValues = async (req, res) => {
//   const { product_id } = req.params;
//   const { pcs, gross_weight } = req.body;

//   // Ensure pcs and gross_weight are not undefined or null, but allow 0
//   if (pcs === undefined || gross_weight === undefined || pcs === null || gross_weight === null) {
//     return res.status(400).json({ error: "pcs and gross_weight are required" });
//   }

//   try {
//     const result = await updateEntryBySubtraction(product_id, pcs, gross_weight);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Entry not found or no changes applied" });
//     }

//     res.status(200).json({ message: "Entry updated successfully" });
//   } catch (error) {
//     console.error("Error updating entry:", error);
//     res.status(500).json({ message: "Database error" });
//   }
// };


const addEntryHandler = (req, res) => {
  const { product_id, pcs, gross_weight, tag_id } = req.body;

  if (!product_id || !tag_id) {
    return res.status(400).json({ error: "Product ID and Tag ID are required" });
  }

  getEntryByTagAndProduct(tag_id, product_id, (err, results) => {
    if (err) {
      console.error("Error fetching entry:", err);
      return res.status(500).json({ error: "Database error" });
    }

    let bal_pcs, bal_gross_weight;

    if (results.length > 0) {
      const existingData = results[0];
      const old_pcs = existingData.pcs;
      const old_gross_weight = existingData.gross_weight;

      // Convert database values to numbers to prevent string concatenation
      const current_bal_pcs = parseInt(existingData.bal_pcs) || old_pcs;
      const current_bal_gross_weight = parseFloat(existingData.bal_gross_weight) || old_gross_weight;

      // Compute the differences
      const diff_pcs = pcs - old_pcs;
      const diff_gross_weight = gross_weight - old_gross_weight;

      bal_pcs = diff_pcs > 0 ? current_bal_pcs + diff_pcs : current_bal_pcs - Math.abs(diff_pcs);
      bal_gross_weight = diff_gross_weight > 0 
        ? current_bal_gross_weight + diff_gross_weight 
        : current_bal_gross_weight - Math.abs(diff_gross_weight);

      // console.log("Updating bal_gross_weight:", { current_bal_gross_weight, diff_gross_weight, bal_gross_weight });

      // Update the existing entry
      const updatedData = { product_id, pcs, gross_weight, bal_pcs, bal_gross_weight, tag_id };
      updateEntry(updatedData, (updateErr) => {
        if (updateErr) {
          console.error("Error updating entry:", updateErr);
          return res.status(500).json({ error: "Database error while updating" });
        }
        res.status(200).json({ message: "Entry updated successfully" });
      });
    } else {
      bal_pcs = pcs;
      bal_gross_weight = gross_weight;

      const newData = { product_id, pcs, gross_weight, bal_pcs, bal_gross_weight, tag_id };
      addEntry(newData, (insertErr, result) => {
        if (insertErr) {
          console.error("Error inserting entry:", insertErr);
          return res.status(500).json({ error: "Database error while inserting" });
        }
        res.status(201).json({ message: "Entry added successfully", entryId: result.insertId });
      });
    }
  });
};

const getMaxTagId = (req, res) => {
  const query = "SELECT MAX(tag_id) AS maxTag FROM updated_values_table";

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching max tag_id:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const maxTag = result[0].maxTag || 0; // If no records, default to 0
    res.json({ nextTagId: maxTag + 1 }); // Return next available tag_id
  });
};

const getEntryHandler = (req, res) => {
  const { productId, tagId } = req.params; // Extract productId and tagId from request

  if (!productId || !tagId) {
    return res.status(400).json({ error: 'Product ID and Tag ID are required' });
  }

  getEntryById(productId, tagId, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.status(200).json(results[0]); // Return the first matching entry
  });
};

const deleteData = (req, res) => {
  const { tag_id, product_id } = req.params;

  deleteEntry(tag_id, product_id, (err, result) => {
    if (err) {
      console.error("Error deleting entry:", err);
      return res.status(500).json({ message: "Error deleting entry" });
    }

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Entry deleted successfully" });
    } else {
      res.status(404).json({ message: "Entry not found" });
    }
  });
};

const getBalance = (req, res) => {
  const { product_id, tag_id } = req.params;

  if (!product_id || !tag_id) {
    return res.status(400).json({ error: "Product ID and Tag ID are required" });
  }

  getBalanceByProductAndTag(product_id, tag_id, (err, balance) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (balance) {
      res.json(balance);
    } else {
      res.status(404).json({ error: "No matching record found" });
    }
  });
};

module.exports = { addEntryHandler, getEntryHandler, getMaxTagId, getBalance, deleteData };
