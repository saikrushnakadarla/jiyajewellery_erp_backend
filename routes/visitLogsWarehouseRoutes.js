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
      LEFT JOIN account_details c ON vlws.customer_id = c.account_id
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
      LEFT JOIN account_details c ON vlws.customer_id = c.account_id
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
    const { customer_id, warehouse_id, barcodes, scheduled_date } = req.body;
    
    console.log('📝 Received data:', { 
      customer_id, 
      warehouse_id, 
      barcodes, 
      scheduled_date,
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
      'SELECT account_id, account_name, account_group FROM account_details WHERE account_id = ?', 
      [customerIdInt]
    );
    
    console.log(`📊 Customer query result:`, customer);
    
    if (customer.length === 0) {
      console.log(`❌ Customer with account_id ${customerIdInt} not found`);
      return res.status(400).json({ 
        success: false, 
        message: `Invalid customer selected. Account with ID ${customerIdInt} does not exist.` 
      });
    }
    
    // Check if account is a customer
    const accountGroup = customer[0].account_group;
    const isCustomer = accountGroup && (accountGroup.toUpperCase() === 'CUSTOMERS');
    
    if (!isCustomer) {
      console.log(`❌ Account ${customerIdInt} is not a customer. Group: ${accountGroup}`);
      return res.status(400).json({ 
        success: false, 
        message: `Account ${customerIdInt} is not a customer. Current group: ${accountGroup}` 
      });
    }
    
    console.log(`✅ Customer validated: ${customer[0].account_name} (${customer[0].account_id})`);
    
    // Step 2: Validate warehouse/stock point exists
    console.log(`🔍 Checking warehouse with ID: ${warehouseIdInt}`);
    const warehouse = await queryAsync(
      'SELECT stock_point_id, stock_point_name, status FROM stock_points WHERE stock_point_id = ?', 
      [warehouseIdInt]
    );
    
    console.log(`📊 Warehouse query result:`, warehouse);
    
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
    
    // Step 3: Validate each barcode exists in stock transfers for this warehouse
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
    
    // Step 4: Check for duplicate schedules for each barcode
    const existingSchedules = [];
    for (const barcode of validBarcodes) {
      const existing = await queryAsync(
        `SELECT id, barcode FROM visit_logs_warehouse_schedule 
         WHERE customer_id = ? AND warehouse_id = ? AND barcode = ? 
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
    
    // Step 5: Insert schedules for each barcode
    const insertedIds = [];
    for (const barcode of validBarcodes) {
      console.log(`📝 Inserting schedule for barcode: ${barcode}...`);
      const result = await queryAsync(
        `INSERT INTO visit_logs_warehouse_schedule 
         (customer_id, warehouse_id, barcode, scheduled_date) 
         VALUES (?, ?, ?, ?)`,
        [customerIdInt, warehouseIdInt, barcode, scheduled_date]
      );
      insertedIds.push(result.insertId);
      console.log(`✅ Schedule inserted with ID: ${result.insertId}`);
    }
    
    // Step 6: Create notification for the customer
    const barcodeDetailsList = barcodeDetails.map(d => d.product_name).join(', ');
    await createWarehouseScheduleNotification(
      customerIdInt, 
      warehouseIdInt, 
      validBarcodes, 
      scheduled_date,
      warehouse[0].stock_point_name,
      barcodeDetailsList
    );
    
    // Send admin notification via SSE if available
    if (global.sendAdminNotification) {
      global.sendAdminNotification({
        type: 'NEW_WAREHOUSE_SCHEDULE',
        message: `New warehouse visit scheduled for customer #${customerIdInt} with ${validBarcodes.length} barcodes`,
        customer_id: customerIdInt,
        warehouse_id: warehouseIdInt,
        barcodes: validBarcodes,
        scheduled_date: scheduled_date,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: `${validBarcodes.length} warehouse visits scheduled successfully`,
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

// Helper function to create notification for warehouse visit schedule
async function createWarehouseScheduleNotification(customerId, warehouseId, barcodes, scheduledDate, warehouseName, productNames) {
  try {
    console.log(`📧 Creating notification for customer ${customerId}...`);
    
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
    
    const barcodeCount = barcodes.length;
    const title = `🏭 New Warehouse Visit Scheduled (${barcodeCount} items)`;
    const message = `You have a scheduled warehouse visit at ${warehouseName} on ${formattedDate} at ${formattedTime}. Items: ${productNames}. Barcodes: ${barcodes.join(', ')}. Please be available at the scheduled time.`;
    
    // Insert notification
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customerId, title, message, customerId]
    );
    
    console.log(`✅ Notification sent to customer ${customerId}`);
  } catch (error) {
    console.error('❌ Error creating warehouse schedule notification:', error);
  }
}

// PUT - Update warehouse visit schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, warehouse_id, barcodes, scheduled_date, status } = req.body;
    
    console.log(`📝 Updating schedule ${id}:`, { customer_id, warehouse_id, barcodes, scheduled_date, status });
    
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
    
    if (isNaN(customerIdInt) || isNaN(warehouseIdInt)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format' 
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
    
    console.log(`✅ Schedule ${id} found`);
    
    // Validate customer exists in account_details
    const customer = await queryAsync(
      'SELECT account_id, account_name, account_group FROM account_details WHERE account_id = ?', 
      [customerIdInt]
    );
    
    if (customer.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid customer selected. Account ID ${customerIdInt} does not exist.` 
      });
    }
    
    // Check if account is a customer
    const accountGroup = customer[0].account_group;
    const isCustomer = accountGroup && (accountGroup.toUpperCase() === 'CUSTOMERS');
    
    if (!isCustomer) {
      return res.status(400).json({ 
        success: false, 
        message: `Account ${customerIdInt} is not a customer. Current group: ${accountGroup}` 
      });
    }
    
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
    
    // Get old data for notification
    const oldCustomerId = existing[0].customer_id;
    const oldWarehouseId = existing[0].warehouse_id;
    const oldBarcode = existing[0].barcode;
    
    // For multiple barcodes, we need to handle differently
    // Since the table has one barcode per row, we'll delete all schedules for this ID
    // and create new ones for each barcode
    
    // Delete existing schedule
    await queryAsync(
      'DELETE FROM visit_logs_warehouse_schedule WHERE id = ?',
      [id]
    );
    
    // Insert new schedules for each barcode
    const insertedIds = [];
    for (const barcode of barcodes) {
      const result = await queryAsync(
        `INSERT INTO visit_logs_warehouse_schedule 
         (customer_id, warehouse_id, barcode, scheduled_date, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [customerIdInt, warehouseIdInt, barcode, scheduled_date, status || 'scheduled']
      );
      insertedIds.push(result.insertId);
    }
    
    console.log(`✅ Schedule ${id} updated successfully with ${insertedIds.length} new entries`);
    
    // Send notifications based on changes
    if (oldCustomerId !== customerIdInt) {
      // Notify old customer about change
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [oldCustomerId, '🔄 Warehouse Visit Updated', 'Your scheduled warehouse visit has been reassigned to another customer.', id]
      );
      
      // Notify new customer
      await createWarehouseScheduleNotification(
        customerIdInt, 
        warehouseIdInt, 
        barcodes, 
        scheduled_date,
        warehouse[0].stock_point_name,
        'Updated Products'
      );
    } else if (oldWarehouseId !== warehouseIdInt || oldBarcode !== barcodes[0]) {
      // Notify customer about update
      const warehouseName = warehouse[0].stock_point_name;
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
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [customerIdInt, '🔄 Warehouse Visit Updated', `Your warehouse visit has been updated. New details: ${warehouseName} on ${formattedDate} at ${formattedTime}. Barcodes: ${barcodes.join(', ')}`, id]
      );
    }
    
    // Send admin notification
    if (global.sendAdminNotification) {
      global.sendAdminNotification({
        type: 'WAREHOUSE_SCHEDULE_UPDATED',
        message: `Warehouse visit schedule #${id} updated with ${insertedIds.length} items`,
        schedule_id: id,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true, message: 'Warehouse schedule updated successfully', scheduleIds: insertedIds });
    
  } catch (error) {
    console.error('❌ Error updating warehouse schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update warehouse schedule' 
    });
  }
});

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
    
    const { customer_id, barcode } = schedule[0];
    
    const result = await queryAsync(
      'DELETE FROM visit_logs_warehouse_schedule WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows > 0) {
      console.log(`✅ Schedule ${id} deleted successfully`);
      
      // Notify customer about cancellation
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [customer_id, '❌ Warehouse Visit Cancelled', `Your warehouse visit (Barcode: ${barcode}) has been cancelled. Please contact support for more information.`, id]
      );
      
      // Send admin notification
      if (global.sendAdminNotification) {
        global.sendAdminNotification({
          type: 'WAREHOUSE_SCHEDULE_DELETED',
          message: `Warehouse visit schedule #${id} deleted`,
          schedule_id: id,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.json({ success: true, message: 'Warehouse schedule deleted successfully' });
    
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
      WHERE vlws.customer_id = ?
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
    
    console.log(`✅ Schedule ${id} status updated to ${status}`);
    
    // Get customer info for notification
    const schedule = await queryAsync(
      'SELECT customer_id, barcode FROM visit_logs_warehouse_schedule WHERE id = ?',
      [id]
    );
    
    if (schedule.length > 0) {
      const statusMessages = {
        'completed': '✅ Warehouse Visit Completed',
        'cancelled': '❌ Warehouse Visit Cancelled',
        'scheduled': '📅 Warehouse Visit Rescheduled'
      };
      
      const statusDetails = {
        'completed': 'Your warehouse visit has been marked as completed.',
        'cancelled': 'Your warehouse visit has been cancelled.',
        'scheduled': 'Your warehouse visit has been rescheduled.'
      };
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [schedule[0].customer_id, statusMessages[status] || 'Status Updated', 
         `${statusDetails[status] || 'Status updated.'} (Barcode: ${schedule[0].barcode})`, id]
      );
      
      console.log(`✅ Notification sent to customer ${schedule[0].customer_id}`);
    }
    
    res.json({ 
      success: true, 
      message: `Schedule status updated to ${status}` 
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
      ORDER BY account_name ASC
    `);
    
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

module.exports = router;