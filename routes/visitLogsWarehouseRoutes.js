const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper function to promisify db.query
const queryAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Helper function to create notification for customer when warehouse visit is scheduled
async function createWarehouseScheduleNotification(customerAccountId, warehouseId, barcode, scheduledDate, salesmanId, salesmanName) {
  try {
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name, customer_id, email, mobile FROM account_details WHERE account_id = ?',
      [customerAccountId]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name, location FROM stock_points WHERE stock_point_id = ?',
      [warehouseId]
    );
    
    // Get barcode product details
    const barcodeDetails = await queryAsync(`
      SELECT sti.product_name, sti.category, sti.design_name
      FROM stock_transfer_items sti
      WHERE sti.PCode_BarCode = ?
      LIMIT 1
    `, [barcode]);
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const warehouseName = warehouse.length > 0 ? warehouse[0].stock_point_name : 'Warehouse';
    const productName = barcodeDetails.length > 0 ? barcodeDetails[0].product_name : 'Product';
    
    const scheduledDateTime = new Date(scheduledDate);
    const formattedDate = scheduledDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const title = '📦 New Warehouse Visit Scheduled';
    const message = `A warehouse visit has been scheduled for you at ${warehouseName} on ${formattedDate} at ${formattedTime}. 
      Product: ${productName} (Barcode: ${barcode})
      ${salesmanName ? `Salesperson: ${salesmanName}` : 'No salesperson assigned yet.'}
      Please be available at the scheduled time.`;
    
    // Insert notification for customer
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customerAccountId, title, message, customerAccountId]
    );
    
    console.log(`✅ Warehouse schedule notification sent to customer ${customerAccountId}`);
    
    // Also send notification to salesman if assigned
    if (salesmanId) {
      const salesmanTitle = '📦 New Warehouse Visit Assignment';
      const salesmanMessage = `You have been assigned to visit ${customerName} at ${warehouseName} on ${formattedDate} at ${formattedTime}.
        Product: ${productName} (Barcode: ${barcode})
        Customer: ${customerName} (${customer.length > 0 ? customer[0].customer_id : 'N/A'})`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesmanId, salesmanTitle, salesmanMessage, customerAccountId]
      );
      
      console.log(`✅ Warehouse schedule notification sent to salesman ${salesmanId}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating warehouse schedule notification:', error);
    return false;
  }
}

// GET - Fetch all scheduled warehouse visits
router.get('/', async (req, res) => {
  try {
    console.log('📋 Fetching all warehouse visit schedules...');
    
    const schedules = await queryAsync(`
      SELECT 
        vlws.*,
        c.customer_id as customer_code,
        c.account_name as customer_name,
        c.phone as customer_phone,
        c.mobile as customer_mobile,
        c.email as customer_email,
        sp.stock_point_name as warehouse_name,
        sp.location as warehouse_location
      FROM visit_logs_warehouse_schedule vlws
      LEFT JOIN account_details c ON vlws.customer_account_id = c.account_id
      LEFT JOIN stock_points sp ON vlws.warehouse_id = sp.stock_point_id
      ORDER BY vlws.scheduled_date DESC
    `);
    
    console.log(`✅ Found ${schedules.length} schedules`);
    res.json(schedules);
  } catch (error) {
    console.error('❌ Error fetching warehouse schedules:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch scheduled warehouse visits' 
    });
  }
});

// GET - Fetch single scheduled visit by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching schedule with ID: ${id}`);
    
    const schedule = await queryAsync(`
      SELECT 
        vlws.*,
        c.customer_id as customer_code,
        c.account_name as customer_name,
        c.phone as customer_phone,
        c.mobile as customer_mobile,
        c.email as customer_email,
        sp.stock_point_name as warehouse_name,
        sp.location as warehouse_location,
        sp.warehouse_id
      FROM visit_logs_warehouse_schedule vlws
      LEFT JOIN account_details c ON vlws.customer_account_id = c.account_id
      LEFT JOIN stock_points sp ON vlws.warehouse_id = sp.stock_point_id
      WHERE vlws.id = ?
    `, [id]);
    
    if (schedule.length === 0) {
      console.log(`❌ Schedule with ID ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }
    
    console.log(`✅ Schedule found: ${schedule[0].id}`);
    res.json(schedule[0]);
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch schedule' 
    });
  }
});

// POST - Create new warehouse visit schedule with multiple barcodes
router.post('/', async (req, res) => {
  try {
    const { customer_id, warehouse_id, barcodes, scheduled_date, salesman_id, salesman_name } = req.body;
    
    console.log('📝 Received data:', { 
      customer_id, 
      warehouse_id, 
      barcodes, 
      scheduled_date,
      salesman_id,
      salesman_name,
      barcode_count: barcodes ? barcodes.length : 0
    });
    
    // Validate required fields
    if (!customer_id || !warehouse_id || !barcodes || !barcodes.length || !scheduled_date) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: customer_id, warehouse_id, barcodes (array), scheduled_date' 
      });
    }
    
    // Convert IDs to integers
    const customerIdInt = parseInt(customer_id);
    const warehouseIdInt = parseInt(warehouse_id);
    const salesmanIdInt = salesman_id ? parseInt(salesman_id) : null;
    
    if (isNaN(customerIdInt) || isNaN(warehouseIdInt)) {
      console.log('❌ Invalid ID format:', { customerIdInt, warehouseIdInt });
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format. Customer ID and Warehouse ID must be numbers.' 
      });
    }
    
    // Step 1: Validate customer exists in account_details
    console.log(`🔍 Checking customer with account_id: ${customerIdInt}`);
    const customer = await queryAsync(
      'SELECT account_id, customer_id, account_name, account_group FROM account_details WHERE account_id = ?', 
      [customerIdInt]
    );
    
    if (customer.length === 0) {
      console.log(`❌ Customer with account_id ${customerIdInt} not found`);
      return res.status(400).json({ 
        success: false, 
        message: `Invalid customer selected. Account with ID ${customerIdInt} does not exist.` 
      });
    }
    
    const accountGroup = customer[0].account_group;
    const isCustomer = accountGroup && (accountGroup.toUpperCase() === 'CUSTOMERS');
    
    if (!isCustomer) {
      console.log(`❌ Account ${customerIdInt} is not a customer. Group: ${accountGroup}`);
      return res.status(400).json({ 
        success: false, 
        message: `Account ${customerIdInt} is not a customer. Current group: ${accountGroup}` 
      });
    }
    
    const actualCustomerId = customer[0].customer_id || customer[0].account_id;
    console.log(`✅ Customer validated: ${customer[0].account_name} (Account ID: ${customer[0].account_id}, Customer ID: ${actualCustomerId})`);
    
    // Step 2: Validate warehouse/stock point exists
    console.log(`🔍 Checking warehouse with ID: ${warehouseIdInt}`);
    const warehouse = await queryAsync(
      'SELECT stock_point_id, stock_point_name, status FROM stock_points WHERE stock_point_id = ?', 
      [warehouseIdInt]
    );
    
    if (warehouse.length === 0) {
      console.log(`❌ Warehouse with ID ${warehouseIdInt} not found`);
      return res.status(400).json({ 
        success: false, 
        message: `Invalid warehouse/stock point selected. ID ${warehouseIdInt} does not exist.` 
      });
    }
    
    if (warehouse[0].status !== 'active') {
      console.log(`❌ Warehouse ${warehouseIdInt} is not active. Status: ${warehouse[0].status}`);
      return res.status(400).json({ 
        success: false, 
        message: `Warehouse is not active. Current status: ${warehouse[0].status}` 
      });
    }
    
    console.log(`✅ Warehouse validated: ${warehouse[0].stock_point_name}`);
    
    // Step 3: Validate salesman if provided
    let finalSalesmanName = salesman_name || null;
    if (salesmanIdInt) {
      console.log(`🔍 Checking salesman with account_id: ${salesmanIdInt}`);
      const salesman = await queryAsync(
        'SELECT account_id, account_name FROM account_details WHERE account_id = ? AND account_group = ?',
        [salesmanIdInt, 'SALESMAN']
      );
      
      if (salesman.length === 0) {
        console.log(`❌ Salesman with account_id ${salesmanIdInt} not found or not a salesman`);
        return res.status(400).json({
          success: false,
          message: `Invalid salesman selected. Account ID ${salesmanIdInt} is not a salesman.`
        });
      }
      finalSalesmanName = salesman_name || salesman[0].account_name;
      console.log(`✅ Salesman validated: ${finalSalesmanName}`);
    }
    
    // Step 4: Validate each barcode exists in stock transfers for this warehouse
    const validBarcodes = [];
    const invalidBarcodes = [];
    const barcodeDetails = [];
    
    for (const barcode of barcodes) {
      console.log(`🔍 Checking barcode "${barcode}" for warehouse ${warehouseIdInt}`);
      try {
        const barcodeExists = await queryAsync(`
          SELECT 
            sti.PCode_BarCode,
            sti.product_name,
            sti.category,
            sti.design_name,
            sti.qty,
            sti.gross_weight,
            sti.net_weight,
            st.transfer_id,
            st.transfer_number
          FROM stock_transfer_items sti
          JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
          WHERE sti.PCode_BarCode = ?
            AND (st.from_stock_point_id = ? OR st.to_stock_point_id = ?)
            AND st.status = 'completed'
          LIMIT 1
        `, [barcode, warehouseIdInt, warehouseIdInt]);
        
        if (barcodeExists.length > 0) {
          validBarcodes.push(barcode);
          barcodeDetails.push(barcodeExists[0]);
          console.log(`✅ Barcode "${barcode}" validated: ${barcodeExists[0].product_name}`);
        } else {
          invalidBarcodes.push(barcode);
          console.log(`❌ Barcode "${barcode}" not found in completed transfers for warehouse ${warehouseIdInt}`);
        }
      } catch (error) {
        console.error(`❌ Error validating barcode ${barcode}:`, error);
        invalidBarcodes.push(barcode);
      }
    }
    
    if (invalidBarcodes.length > 0) {
      console.log(`❌ ${invalidBarcodes.length} barcodes are invalid:`, invalidBarcodes);
      return res.status(400).json({ 
        success: false, 
        message: `Some barcodes are not valid for this warehouse: ${invalidBarcodes.join(', ')}` 
      });
    }
    
    // Step 5: Check for duplicate schedules for each barcode
    const existingSchedules = [];
    for (const barcode of validBarcodes) {
      const existing = await queryAsync(
        `SELECT id, barcode FROM visit_logs_warehouse_schedule 
         WHERE customer_account_id = ? AND warehouse_id = ? AND barcode = ? 
         AND status = 'scheduled'`,
        [customerIdInt, warehouseIdInt, barcode]
      );
      
      if (existing.length > 0) {
        existingSchedules.push(barcode);
      }
    }
    
    if (existingSchedules.length > 0) {
      console.log(`⚠️ Duplicate schedules found for barcodes:`, existingSchedules);
      return res.status(400).json({ 
        success: false, 
        message: `Scheduled visits already exist for these barcodes: ${existingSchedules.join(', ')}` 
      });
    }
    
    console.log('✅ No duplicates found');
    
    // Step 6: Insert schedules for each barcode with salesman info
    const insertedIds = [];
    for (const barcode of validBarcodes) {
      console.log(`📝 Inserting schedule for barcode: ${barcode}...`);
      
      const result = await queryAsync(
        `INSERT INTO visit_logs_warehouse_schedule 
         (customer_account_id, customer_id, warehouse_id, barcode, scheduled_date, salesman_id, salesman_name) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customerIdInt, actualCustomerId, warehouseIdInt, barcode, scheduled_date, salesmanIdInt, finalSalesmanName]
      );
      insertedIds.push(result.insertId);
      console.log(`✅ Schedule inserted with ID: ${result.insertId} (customer_id: ${actualCustomerId}, salesman: ${finalSalesmanName || 'Not assigned'})`);
      
      // Send notification for each barcode
      await createWarehouseScheduleNotification(
        customerIdInt, 
        warehouseIdInt, 
        barcode, 
        scheduled_date, 
        salesmanIdInt, 
        finalSalesmanName
      );
    }
    
    res.status(201).json({ 
      success: true, 
      message: `${validBarcodes.length} warehouse visits scheduled successfully with notifications sent`,
      scheduleIds: insertedIds
    });
    
  } catch (error) {
    console.error('❌ Error creating warehouse schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to schedule warehouse visit: ' + error.message 
    });
  }
});

// Helper function for update notification
async function createWarehouseScheduleUpdateNotification(customerAccountId, warehouseId, barcode, scheduledDate, salesmanId, salesmanName, oldSchedule) {
  try {
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name, customer_id FROM account_details WHERE account_id = ?',
      [customerAccountId]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouseId]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const warehouseName = warehouse.length > 0 ? warehouse[0].stock_point_name : 'Warehouse';
    
    const scheduledDateTime = new Date(scheduledDate);
    const formattedDate = scheduledDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const title = '📦 Warehouse Visit Updated';
    const message = `Your warehouse visit at ${warehouseName} has been updated to ${formattedDate} at ${formattedTime}.
      Barcode: ${barcode}
      ${salesmanName ? `Salesperson: ${salesmanName}` : 'No salesperson assigned.'}`;
    
    // Insert notification for customer
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customerAccountId, title, message, customerAccountId]
    );
    
    console.log(`✅ Warehouse schedule update notification sent to customer ${customerAccountId}`);
    
    // Send notification to salesman if assigned
    if (salesmanId) {
      const salesmanTitle = '📦 Warehouse Visit Assignment Updated';
      const salesmanMessage = `Your warehouse visit assignment has been updated.
        Customer: ${customerName}
        Warehouse: ${warehouseName}
        Date: ${formattedDate} at ${formattedTime}
        Barcode: ${barcode}`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesmanId, salesmanTitle, salesmanMessage, customerAccountId]
      );
      
      console.log(`✅ Warehouse schedule update notification sent to salesman ${salesmanId}`);
    }
  } catch (error) {
    console.error('❌ Error creating warehouse update notification:', error);
  }
}

// PUT - Update warehouse visit schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, warehouse_id, barcodes, scheduled_date, status, salesman_id, salesman_name } = req.body;
    
    console.log(`📝 Updating schedule ${id}:`, { customer_id, warehouse_id, barcodes, scheduled_date, status, salesman_id, salesman_name });
    
    // Validate required fields
    if (!customer_id || !warehouse_id || !barcodes || !barcodes.length || !scheduled_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Convert IDs to integers
    const customerIdInt = parseInt(customer_id);
    const warehouseIdInt = parseInt(warehouse_id);
    const salesmanIdInt = salesman_id ? parseInt(salesman_id) : null;
    
    if (isNaN(customerIdInt) || isNaN(warehouseIdInt)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format' 
      });
    }
    
    // Check if schedule exists and get old data
    const existing = await queryAsync(
      'SELECT * FROM visit_logs_warehouse_schedule WHERE id = ?', 
      [id]
    );
    
    if (existing.length === 0) {
      console.log(`❌ Schedule ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }
    
    const oldSchedule = existing[0];
    console.log(`✅ Schedule ${id} found`);
    
    // Validate customer exists in account_details
    const customer = await queryAsync(
      'SELECT account_id, customer_id, account_name, account_group FROM account_details WHERE account_id = ?', 
      [customerIdInt]
    );
    
    if (customer.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid customer selected. Account ID ${customerIdInt} does not exist.` 
      });
    }
    
    const accountGroup = customer[0].account_group;
    const isCustomer = accountGroup && (accountGroup.toUpperCase() === 'CUSTOMERS');
    
    if (!isCustomer) {
      return res.status(400).json({ 
        success: false, 
        message: `Account ${customerIdInt} is not a customer. Current group: ${accountGroup}` 
      });
    }
    
    const actualCustomerId = customer[0].customer_id || customer[0].account_id;
    
    // Validate warehouse exists
    const warehouse = await queryAsync(
      'SELECT stock_point_id, stock_point_name FROM stock_points WHERE stock_point_id = ?', 
      [warehouseIdInt]
    );
    
    if (warehouse.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid warehouse/stock point selected. ID ${warehouseIdInt} does not exist.` 
      });
    }
    
    // Validate salesman if provided
    let finalSalesmanName = salesman_name || null;
    if (salesmanIdInt) {
      const salesman = await queryAsync(
        'SELECT account_id, account_name FROM account_details WHERE account_id = ? AND account_group = ?',
        [salesmanIdInt, 'SALESMAN']
      );
      
      if (salesman.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid salesman selected. Account ID ${salesmanIdInt} is not a salesman.`
        });
      }
      finalSalesmanName = salesman_name || salesman[0].account_name;
    }
    
    // Get old barcodes for notification
    const oldBarcode = oldSchedule.barcode;
    
    // Delete existing schedule
    await queryAsync(
      'DELETE FROM visit_logs_warehouse_schedule WHERE id = ?',
      [id]
    );
    
    // Insert new schedules for each barcode with salesman info
    const insertedIds = [];
    for (const barcode of barcodes) {
      const result = await queryAsync(
        `INSERT INTO visit_logs_warehouse_schedule 
         (customer_account_id, customer_id, warehouse_id, barcode, scheduled_date, status, salesman_id, salesman_name) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerIdInt, actualCustomerId, warehouseIdInt, barcode, scheduled_date, status || 'scheduled', salesmanIdInt, finalSalesmanName]
      );
      insertedIds.push(result.insertId);
      
      // Send update notification for each barcode
      await createWarehouseScheduleUpdateNotification(
        customerIdInt,
        warehouseIdInt,
        barcode,
        scheduled_date,
        salesmanIdInt,
        finalSalesmanName,
        oldSchedule
      );
    }
    
    console.log(`✅ Schedule ${id} updated successfully with ${insertedIds.length} new entries`);
    
    res.json({ success: true, message: 'Warehouse schedule updated successfully with notifications sent', scheduleIds: insertedIds });
    
  } catch (error) {
    console.error('❌ Error updating warehouse schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update warehouse schedule' 
    });
  }
});

// Helper function for deletion notification
async function createWarehouseScheduleDeletionNotification(scheduleData) {
  try {
    const { customer_account_id, warehouse_id, barcode, scheduled_date, salesman_id, salesman_name } = scheduleData;
    
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name FROM account_details WHERE account_id = ?',
      [customer_account_id]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouse_id]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const warehouseName = warehouse.length > 0 ? warehouse[0].stock_point_name : 'Warehouse';
    
    const scheduledDateTime = new Date(scheduled_date);
    const formattedDate = scheduledDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const title = '❌ Warehouse Visit Cancelled';
    const message = `Your warehouse visit at ${warehouseName} scheduled for ${formattedDate} at ${formattedTime} has been cancelled.
      Barcode: ${barcode}
      Please contact us for more information.`;
    
    // Insert notification for customer
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customer_account_id, title, message, customer_account_id]
    );
    
    console.log(`✅ Warehouse schedule deletion notification sent to customer ${customer_account_id}`);
    
    // Send notification to salesman if assigned
    if (salesman_id) {
      const salesmanTitle = '❌ Warehouse Visit Assignment Cancelled';
      const salesmanMessage = `Your warehouse visit assignment has been cancelled.
        Customer: ${customerName}
        Warehouse: ${warehouseName}
        Scheduled Date: ${formattedDate} at ${formattedTime}
        Barcode: ${barcode}`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesman_id, salesmanTitle, salesmanMessage, customer_account_id]
      );
      
      console.log(`✅ Warehouse schedule deletion notification sent to salesman ${salesman_id}`);
    }
  } catch (error) {
    console.error('❌ Error creating warehouse deletion notification:', error);
  }
}

// DELETE - Delete warehouse visit schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting schedule ${id}...`);
    
    // Get schedule details before deleting
    const schedule = await queryAsync(
      'SELECT * FROM visit_logs_warehouse_schedule WHERE id = ?', 
      [id]
    );
    
    if (schedule.length === 0) {
      console.log(`❌ Schedule ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }
    
    const scheduleData = schedule[0];
    
    // Send deletion notifications
    await createWarehouseScheduleDeletionNotification(scheduleData);
    
    const result = await queryAsync(
      'DELETE FROM visit_logs_warehouse_schedule WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows > 0) {
      console.log(`✅ Schedule ${id} deleted successfully`);
    }
    
    res.json({ success: true, message: 'Warehouse schedule deleted successfully with notifications sent' });
    
  } catch (error) {
    console.error('❌ Error deleting warehouse schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete warehouse schedule' 
    });
  }
});

// GET - Get barcodes for a specific warehouse/stock point
router.get('/barcodes/:warehouseId', async (req, res) => {
  try {
    const { warehouseId } = req.params;
    console.log(`📋 Fetching barcodes for warehouse ${warehouseId}...`);
    
    const barcodes = await queryAsync(`
      SELECT DISTINCT
        sti.PCode_BarCode as barcode,
        sti.product_name,
        sti.category,
        sti.sub_category,
        sti.design_name,
        sti.qty,
        sti.gross_weight,
        sti.net_weight,
        sti.rate,
        sti.total_price,
        st.transfer_id,
        st.transfer_number,
        st.transfer_date
      FROM stock_transfer_items sti
      JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
      WHERE (st.from_stock_point_id = ? OR st.to_stock_point_id = ?)
        AND st.status = 'completed'
      ORDER BY st.transfer_date DESC
    `, [warehouseId, warehouseId]);
    
    console.log(`✅ Found ${barcodes.length} barcodes`);
    res.json({
      success: true,
      barcodes: barcodes
    });
  } catch (error) {
    console.error('❌ Error fetching barcodes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch barcodes' 
    });
  }
});

// GET - Get scheduled visits for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log(`📋 Fetching schedules for customer ${customerId}...`);
    
    const schedules = await queryAsync(`
      SELECT 
        vlws.*,
        sp.stock_point_name as warehouse_name,
        sp.location as warehouse_location
      FROM visit_logs_warehouse_schedule vlws
      LEFT JOIN stock_points sp ON vlws.warehouse_id = sp.stock_point_id
      WHERE vlws.customer_account_id = ?
        AND vlws.status = 'scheduled'
      ORDER BY vlws.scheduled_date ASC
    `, [customerId]);
    
    console.log(`✅ Found ${schedules.length} schedules for customer ${customerId}`);
    res.json(schedules);
  } catch (error) {
    console.error('❌ Error fetching customer schedules:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch customer schedules' 
    });
  }
});

// Helper function for status change notification
async function createWarehouseScheduleStatusNotification(scheduleData, newStatus) {
  try {
    const { customer_account_id, warehouse_id, barcode, scheduled_date, salesman_id, salesman_name } = scheduleData;
    
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name FROM account_details WHERE account_id = ?',
      [customer_account_id]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouse_id]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const warehouseName = warehouse.length > 0 ? warehouse[0].stock_point_name : 'Warehouse';
    
    let title, message;
    
    if (newStatus === 'completed') {
      title = '✅ Warehouse Visit Completed';
      message = `Your warehouse visit at ${warehouseName} has been marked as completed.
        Barcode: ${barcode}
        Thank you for your visit!`;
    } else if (newStatus === 'cancelled') {
      title = '❌ Warehouse Visit Cancelled';
      message = `Your warehouse visit at ${warehouseName} has been cancelled.
        Barcode: ${barcode}
        Please contact us for more information.`;
    } else {
      return; // No notification for 'scheduled' status
    }
    
    // Insert notification for customer
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customer_account_id, title, message, customer_account_id]
    );
    
    console.log(`✅ Warehouse schedule status notification sent to customer ${customer_account_id}`);
    
    // Send notification to salesman if assigned
    if (salesman_id) {
      const salesmanTitle = newStatus === 'completed' ? '✅ Warehouse Visit Completed' : '❌ Warehouse Visit Cancelled';
      const salesmanMessage = `Warehouse visit status updated to ${newStatus}.
        Customer: ${customerName}
        Warehouse: ${warehouseName}
        Barcode: ${barcode}`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesman_id, salesmanTitle, salesmanMessage, customer_account_id]
      );
      
      console.log(`✅ Warehouse schedule status notification sent to salesman ${salesman_id}`);
    }
  } catch (error) {
    console.error('❌ Error creating warehouse status notification:', error);
  }
}

// PATCH - Update schedule status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`📝 Updating status for schedule ${id} to ${status}...`);
    
    if (!status || !['scheduled', 'completed', 'cancelled'].includes(status)) {
      console.log(`❌ Invalid status: ${status}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be scheduled, completed, or cancelled' 
      });
    }
    
    // Get schedule details before updating
    const schedule = await queryAsync(
      'SELECT * FROM visit_logs_warehouse_schedule WHERE id = ?', 
      [id]
    );
    
    if (schedule.length === 0) {
      console.log(`❌ Schedule ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }
    
    const result = await queryAsync(
      'UPDATE visit_logs_warehouse_schedule SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      console.log(`❌ Schedule ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }
    
    // Send status update notification
    await createWarehouseScheduleStatusNotification(schedule[0], status);
    
    console.log(`✅ Schedule ${id} status updated to ${status}`);
    
    res.json({ 
      success: true, 
      message: `Schedule status updated to ${status} with notification sent` 
    });
    
  } catch (error) {
    console.error('❌ Error updating schedule status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update schedule status' 
    });
  }
});

// GET - Fetch account details (customers only)
router.get('/account-details', async (req, res) => {
  try {
    console.log('📋 Fetching account details for customers...');
    
    const accounts = await queryAsync(`
      SELECT 
        account_id,
        customer_id,
        user_id,
        account_name,
        print_name,
        account_group,
        op_bal,
        metal_balance,
        dr_cr,
        address1,
        address2,
        city,
        pincode,
        state,
        state_code,
        phone,
        mobile,
        contact_person,
        email,
        birthday,
        anniversary,
        bank_account_no,
        bank_name,
        ifsc_code,
        branch,
        gst_in,
        aadhar_card,
        pan_card,
        created_at,
        religion,
        images,
        password,
        duty_start_time,
        duty_end_time
      FROM account_details 
      WHERE account_group = 'CUSTOMERS'
      ORDER BY account_name ASC    `);
    
    console.log(`✅ Found ${accounts.length} customers`);
    res.json(accounts);
  } catch (error) {
    console.error('❌ Error fetching account details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch account details' 
    });
  }
});

// Helper function for salesman assignment notification
async function createSalesmanAssignmentNotification(scheduleData, salesmanId, salesmanName) {
  try {
    const { customer_account_id, warehouse_id, barcode, scheduled_date } = scheduleData;
    
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name, customer_id, email, mobile FROM account_details WHERE account_id = ?',
      [customer_account_id]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name, location FROM stock_points WHERE stock_point_id = ?',
      [warehouse_id]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const warehouseName = warehouse.length > 0 ? warehouse[0].stock_point_name : 'Warehouse';
    
    const scheduledDateTime = new Date(scheduled_date);
    const formattedDate = scheduledDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Notification to customer about salesman assignment
    const customerTitle = '👤 Salesperson Assigned';
    const customerMessage = `${salesmanName} has been assigned as your salesperson for your warehouse visit at ${warehouseName} on ${formattedDate} at ${formattedTime}.
      Barcode: ${barcode}
      They will assist you during your visit.`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customer_account_id, customerTitle, customerMessage, customer_account_id]
    );
    
    console.log(`✅ Salesman assignment notification sent to customer ${customer_account_id}`);
    
    // Notification to salesman about assignment
    const salesmanTitle = '👤 New Salesperson Assignment';
    const salesmanMessage = `You have been assigned to visit ${customerName} at ${warehouseName} on ${formattedDate} at ${formattedTime}.
      Barcode: ${barcode}
      Customer: ${customerName} (${customer.length > 0 ? customer[0].customer_id : 'N/A'})
      ${customer.length > 0 && customer[0].mobile ? `Contact: ${customer[0].mobile}` : ''}`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [salesmanId, salesmanTitle, salesmanMessage, customer_account_id]
    );
    
    console.log(`✅ Salesman assignment notification sent to salesman ${salesmanId}`);
  } catch (error) {
    console.error('❌ Error creating salesman assignment notification:', error);
  }
}

// PUT - Assign salesman to a visit schedule
router.put('/:id/assign-salesman', async (req, res) => {
  try {
    const { id } = req.params;
    const { salesman_id, salesman_name } = req.body;
    
    console.log(`📝 Assigning salesman to schedule ${id}:`, { salesman_id, salesman_name });
    
    // Validate required fields
    if (!salesman_id) {
      return res.status(400).json({
        success: false,
        message: 'Salesman ID is required'
      });
    }
    
    // Check if schedule exists
    const existing = await queryAsync(
      'SELECT * FROM visit_logs_warehouse_schedule WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      console.log(`❌ Schedule ${id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    // Validate salesman exists in account_details
    const salesman = await queryAsync(
      'SELECT account_id, account_name, account_group FROM account_details WHERE account_id = ? AND account_group = ?',
      [salesman_id, 'SALESMAN']
    );
    
    if (salesman.length === 0) {
      console.log(`❌ Salesman with account_id ${salesman_id} not found or not a salesman`);
      return res.status(400).json({
        success: false,
        message: `Invalid salesman selected. Account ID ${salesman_id} is not a salesman.`
      });
    }
    
    const finalSalesmanName = salesman_name || salesman[0].account_name;
    
    // Update the schedule with salesman_id and salesman_name
    const result = await queryAsync(
      `UPDATE visit_logs_warehouse_schedule 
       SET salesman_id = ?, salesman_name = ?, updated_at = NOW() 
       WHERE id = ?`,
      [salesman_id, finalSalesmanName, id]
    );
    
    if (result.affectedRows === 0) {
      console.log(`❌ Failed to update schedule ${id}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to assign salesman to schedule'
      });
    }
    
    // Send salesman assignment notification
    await createSalesmanAssignmentNotification(existing[0], salesman_id, finalSalesmanName);
    
    console.log(`✅ Salesman assigned to schedule ${id} successfully`);
    
    res.json({
      success: true,
      message: 'Salesman assigned successfully with notification sent',
      data: {
        schedule_id: id,
        salesman_id: salesman_id,
        salesman_name: finalSalesmanName
      }
    });
    
  } catch (error) {
    console.error('❌ Error assigning salesman:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign salesman: ' + error.message
    });
  }
});

// GET - Get all salesmen (for assign dropdown)
router.get('/salesmen', async (req, res) => {
  try {
    console.log('📋 Fetching all salesmen...');
    
    const salesmen = await queryAsync(`
      SELECT 
        account_id,
        account_name,
        phone,
        mobile,
        email,
        duty_start_time,
        duty_end_time
      FROM account_details 
      WHERE account_group = 'SALESMAN'
      ORDER BY account_name ASC
    `);
    
    console.log(`✅ Found ${salesmen.length} salesmen`);
    res.json(salesmen);
  } catch (error) {
    console.error('❌ Error fetching salesmen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salesmen'
    });
  }
});

// GET - Get notifications for a user
router.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType = 'customer', limit = 50 } = req.query;
    
    const notifications = await queryAsync(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND user_type = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, userType, parseInt(limit)]
    );
    
    // Get unread count
    const unreadResult = await queryAsync(
      `SELECT COUNT(*) as unread_count FROM notifications 
       WHERE user_id = ? AND user_type = ? AND is_read = FALSE`,
      [userId, userType]
    );
    
    res.json({
      success: true,
      notifications: notifications,
      unreadCount: unreadResult.length > 0 ? unreadResult[0].unread_count : 0
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notifications' 
    });
  }
});

// PUT - Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await queryAsync(
      `UPDATE notifications SET is_read = TRUE WHERE id = ?`,
      [notificationId]
    );
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notification as read' 
    });
  }
});

// PUT - Mark all notifications as read
router.put('/notifications/mark-all-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType = 'customer' } = req.body;
    
    await queryAsync(
      `UPDATE notifications SET is_read = TRUE 
       WHERE user_id = ? AND user_type = ? AND is_read = FALSE`,
      [userId, userType]
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notifications as read' 
    });
  }
});

module.exports = router;