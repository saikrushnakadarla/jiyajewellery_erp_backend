const express = require("express");
const invoiceController = require("./../../controllers/sales/invoicenumber");

const router = express.Router();

router.get("/lastInvoiceNumber", invoiceController.getLastInvoiceNumber);
router.get("/lastOrderNumber", invoiceController.getLastOrderNumber);

router.post("/convert-order", invoiceController.convertOrderToInvoice);

router.get("/invoice/:order_number", invoiceController.getInvoiceByOrderNumber);

router.put("/update-repair-status/:id", invoiceController.updateRepairStatus);


module.exports = router;
