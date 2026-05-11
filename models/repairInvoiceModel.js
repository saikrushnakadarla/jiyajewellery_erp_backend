const db = require('../db'); // Adjust path based on your project structure

exports.getLastInvoiceNumber = async () => {
    const [results] = await db.promise().query(
        'SELECT invoice_number FROM repair_details ORDER BY invoice_number DESC LIMIT 1'
    );
    return results;
};

exports.insertRepairDetail = async (data) => {
    const { invoice_number, repair_no, customer_id, account_name, mobile, email, address1, address2, city, item, metal_type, purity, category,
        gross_weight, pcs, total_amt, date, image } = data;
    let currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let formattedDate = new Date(date).toLocaleDateString('en-GB'); 
    formattedDate = formattedDate.split('/').reverse().join('-');

    await db.promise().query(
        `INSERT INTO repair_details ( invoice_number, order_number, customer_id, account_name, mobile, email, address1, address2, city,
        sub_category, product_name, metal_type, purity, category, gross_weight, qty, total_price, net_amount, net_bill_amount, bal_amt, invoice, transaction_status,
        time, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoice_number, repair_no, customer_id, account_name, mobile, email, address1, address2, city, item, item, metal_type, purity,
            category, gross_weight, pcs, total_amt, total_amt, total_amt, total_amt, 'Converted', 'ConvertedRepairInvoice', currentTime, formattedDate
        ]
    );
};

exports.updateRepairInvoice = async (repair_id, invoice_number) => {
    await db.promise().query(
        'UPDATE repairs SET invoice = ?, status =?, invoice_number = ? WHERE repair_id = ?',
        ['Converted', 'Delivered to Customer', invoice_number, repair_id]
    );
};

exports.getRepairInvoiceByOrderNumber = async (order_number) => {
  const [rows] = await db.promise().query(
    'SELECT * FROM repair_details WHERE order_number = ?',
    [order_number]
  );
  return rows;
};
