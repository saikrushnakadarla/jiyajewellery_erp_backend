const repairModel = require('../models/repairInvoiceModel');

exports.convertRepairToInvoice = async (req, res) => {
  const repair = req.body;

  try {
    const lastInvoiceResult = await repairModel.getLastInvoiceNumber();

    let nextInvoiceNumber = 'INV001';

    if (lastInvoiceResult.length > 0 && lastInvoiceResult[0].invoice_number) {
      const last = lastInvoiceResult[0].invoice_number.slice(3);
      const next = parseInt(last, 10) + 1;
      nextInvoiceNumber = `INV${String(next).padStart(3, '0')}`;
    }

    const repairDetails = {
      ...repair,
      invoice_number: nextInvoiceNumber,
    };

    await repairModel.insertRepairDetail(repairDetails);
    await repairModel.updateRepairInvoice(repair.repair_id, nextInvoiceNumber);

    res.json({ success: true, invoiceNumber: nextInvoiceNumber });
  } catch (error) {
    console.error('Convert Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRepairInvoice = async (req, res) => {
  const { order_number } = req.params;

  try {
    const rows = await repairModel.getRepairInvoiceByOrderNumber(order_number);

    if (rows.length > 0) {
      res.json({ success: true, invoice: rows[0] });
    } else {
      res.json({ success: false, message: 'Invoice not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
