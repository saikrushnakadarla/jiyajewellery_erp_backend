const productModel = require('../models/productModel');

// Handle adding a new product
const createProduct = (req, res) => {
    productModel.addProduct(req.body, (err, result) => {
        if (err) {
            console.error('Error inserting product:', err);
            res.status(500).json({ message: 'Database error', error: err });
        } else {
            res.status(201).json({ message: 'Product added successfully', product_id: result.insertId });
        }
    });
};

// Handle fetching all products
const getProducts = (req, res) => {
    productModel.getAllProducts((err, products) => {
      if (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Database error', error: err });
      } else {
        res.status(200).json(products);
      }
    });
  };

  // Controller to handle fetching a product by ID
const getProductById = (req, res) => {
  const { id } = req.params;

  productModel.getProductById(id, (err, result) => {
      if (err) {
          console.error('Error fetching product:', err);
          res.status(500).json({ message: 'Database error', error: err });
      } else if (result.length === 0) {
          res.status(404).json({ message: 'Product not found' });
      } else {
          res.status(200).json(result[0]);
      }
  });
};

// Update a product
// const updateProduct = (values, product_id, callback) => {
//   const sql = `UPDATE product 
//                SET 
//                   product_name = ?, rbarcode = ?, Category = ?, design_master = ?, purity = ?, 
//                   item_prefix = ?, short_name = ?, sale_account_head = ?, purchase_account_head = ?, 
//                   status = ?, tax_slab = ?, tax_slab_id = ?, hsn_code = ?, maintain_tags = ?, 
//                   op_qty = ?, op_value = ?, op_weight = ?, huid_no = ?
//                WHERE product_id = ?`;

//   db.query(sql, [...values, product_id], callback);
// };
const updateProduct = (req, res) => {
  const { product_id } = req.params;
  const {
    product_name, rbarcode, Category, design_master, purity, item_prefix,
    short_name, sale_account_head, purchase_account_head, tax_slab, tax_slab_id,
    hsn_code, maintain_tags, op_qty, op_value, op_weight, huid_no
  } = req.body;

  const values = [
    product_name, rbarcode, Category, design_master, purity, item_prefix,
    short_name, sale_account_head, purchase_account_head, tax_slab, tax_slab_id,
    hsn_code, maintain_tags, op_qty, op_value, op_weight, huid_no
  ];

  productModel.updateProduct(values, product_id, (err, result) => {
    if (err) {
      console.error('Error updating product:', err);
      res.status(500).json({ message: 'Database error', error: err });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  });
};

// Delete a product
// const deleteProduct = (product_id, callback) => {
//   const sql = `DELETE FROM product WHERE product_id = ?`;
//   db.query(sql, [product_id], callback);
// };
const deleteProduct = (req, res) => {
  const { product_id } = req.params;

  productModel.deleteProduct(product_id, (err, result) => {
    if (err) {
      console.error('Error deleting product:', err);
      res.status(500).json({ message: 'Database error', error: err });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product deleted successfully' });
    }
  });
};


const checkAndInsertProduct = async (req, res) => {
  const { product_name, Category, purity } = req.body;

  // Validate request
  if (!product_name || !Category || !purity) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check if the product already exists
    const existingProducts = await productModel.checkProductExists(product_name, Category, purity);
    if (existingProducts.length > 0) {
      return res.json({ exists: true, message: 'Product already exists!' });
    }

    // Insert the product
    // await productModel.insertProduct(product_name, Category, design_master, purity);
    res.status(201).json({ exists: false, message: 'Product saved successfully!' });
  } catch (error) {
    console.error('Error in product operation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// const getLastRbarcode = (req, res) => {
//   productModel.getLastRbarcode((err, result) => {
//       if (err) {
//           console.error("Error fetching last rbarcode:", err);
//           return res.status(500).json({ error: "Failed to fetch last rbarcode" });
//       }

//       if (result.length > 0) {
//           const lastRbarcode = result[0].rbarcode;
//           const lastNumber = parseInt(lastRbarcode.slice(2), 10); // Extract numeric part
//           const nextRbarcode = `RB${String(lastNumber + 1).padStart(3, "0")}`; // Increment and pad
//           res.json({ nextRbarcode });
//       } else {
//           res.json({ nextRbarcode: "RB001" }); // Start with RB001 if none exists
//       }
//   });
// };

const getLastRbarcode = (req, res) => {
  productModel.getLastRbarcode((err, result) => {
    if (err) {
      console.error("Error fetching last rbarcode:", err);
      return res.status(500).json({ error: "Failed to fetch last rbarcode" });
    }

    // Ensure result has data
    if (result && result.length > 0) {
      // Extract rbarcode values that start with "RB"
      const rbNumbers = result
        .map(row => row.rbarcode) // Extract rbarcode from each row
        .filter(product => product && product.startsWith("RB")) // Filter only valid RB numbers
        .map(product => parseInt(product.slice(2), 10)) // Extract the numeric part of rbarcode
        .filter(number => !isNaN(number)); // Ensure numeric parsing was successful

      if (rbNumbers.length > 0) {
        // Find the maximum rbarcode number and increment it
        const lastrbNumbers = Math.max(...rbNumbers);
        const nextrbNumbers = `RB${String(lastrbNumbers + 1).padStart(3, "0")}`;
        return res.json({ lastrbNumbers: nextrbNumbers });
      }
    }

    // Default if no valid RB numbers are found
    res.json({ lastrbNumbers: "RB001" });
  });
};


const getLastPcode = (req, res) => {
  productModel.getLastPcode((err, result) => {
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


module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    checkAndInsertProduct,
    deleteProduct,
    getLastRbarcode,
    getLastPcode
};
