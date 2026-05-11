const express = require('express');
const PaymentController = require('../controllers/paymentController');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure 'uploads/invoices' directory exists
const invoiceDir = path.join(__dirname, "../uploads/invoices");
if (!fs.existsSync(invoiceDir)) {
  fs.mkdirSync(invoiceDir, { recursive: true });
}

// Invoice Upload Configuration
const invoiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, invoiceDir); // Save in /uploads/invoices
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Keep invoice number as filename (e.g., INV001.pdf)
  },
});

const uploadInvoice = multer({ storage: invoiceStorage });

// Route to upload invoice PDF
router.post("/upload-invoice", uploadInvoice.single("invoice"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ message: "Invoice uploaded successfully", file: req.file.filename });
});

router.post('/post/payments', PaymentController.addPayment);
router.get('/get/payments', PaymentController.getPayments);
router.get('/get/payment/:id', PaymentController.getPaymentById);
router.put('/edit/receipt/:id', PaymentController.updatePayment);
router.delete('/delete/receipt/:id', PaymentController.deletePayment);

router.put('/edit/payments/:id', PaymentController.updatePurchasePayment);
router.delete('/delete/payments/:id', PaymentController.deletePurchasePayment);



router.post('/post/orderpayments', PaymentController.addOrderPayment);
router.put('/edit/orderreceipt/:id', PaymentController.updateOrderPayment);
router.delete('/delete/orderreceipt/:id', PaymentController.deleteOrderPayment);

module.exports = router;
