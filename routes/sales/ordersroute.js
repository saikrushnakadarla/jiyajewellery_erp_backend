const express = require("express");
const router = express.Router();
const repairController = require("./../../controllers/sales/orders");
const multer = require("multer");
const path = require("path");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/")); // Updated path to be relative to project root
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Configure multer upload
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Routes
router.post(
  "/save-order-details",
  upload.array("product_image", 10), // Allow up to 10 images
  repairController.saveorderDetails
);

  

// router.post(
//   "/save-repair-details",
//   upload.array("product_image", 10), // Allow multiple files
//   repairController.saveRepairDetails
// );
router.get("/get-unique-order-details", repairController.getAllUniqueRepairDetails);
router.get("/get-order-details/:order_number", repairController.getRepairDetailsByInvoiceNumber);
router.get('/getorders/:order_number', repairController.getAllRepairDetailsByInvoiceNumber);


router.get('/get/repair-details', repairController.getAllRepairDetails);

router.delete('/order-details/:orderNumber', repairController.deleteOrderDetails);
router.put('/update-order-status', repairController.updateOrderStatus);

module.exports = router;

