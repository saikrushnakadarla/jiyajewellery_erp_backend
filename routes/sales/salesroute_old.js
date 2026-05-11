const express = require("express");
const router = express.Router();
const repairController = require("./../../controllers/sales/sales");

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/")); // Folder to save files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`); // Unique filename
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});


  

router.post(
  "/save-repair-details",
  upload.array("product_image", 10), // Allow multiple files
  repairController.saveRepairDetails
);



router.post(
  "/save-order-details",
  upload.array("product_image", 10), // Allow multiple images, up to 10
  repairController.saveorderDetails
);

router.get("/get-unique-repair-details", repairController.getAllUniqueRepairDetails);
router.get("/get-repair-details/:invoice_number", repairController.getRepairDetailsByInvoiceNumber);
router.get('/getsales/:invoice_number', repairController.getAllRepairDetailsByInvoiceNumber);


router.get('/get/repair-details', repairController.getAllRepairDetails);
router.delete('/repair-details/:invoiceNumber', repairController.deleteRepairDetails);

router.put('/update-order-status', repairController.updateOrderStatus);

module.exports = router;


