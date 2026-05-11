const express = require('express');
const productController = require('../controllers/productController');


const router = express.Router();

// POST: Add a new product
router.post('/post/products', productController.createProduct);
router.get('/get/products', productController.getProducts);
router.get('/get/products/:id', productController.getProductById);
router.put('/put/products/:product_id', productController.updateProduct);
router.delete('/delete/products/:product_id', productController.deleteProduct);
router.post('/api/check-and-insert', productController.checkAndInsertProduct);
router.get('/last-rbarcode', productController.getLastRbarcode);
router.get('/last-pbarcode', productController.getLastPcode);

module.exports = router;
