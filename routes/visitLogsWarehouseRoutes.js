const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { sendPushToUser } = require('../utils/sendPush'); // 👈 ADDED: Push notification helper

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/salesman-photos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `salesman-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "tharunkumarreddy1212@gmail.com",
    pass: "cglm sfpj sphy rtqh"
  }
});

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

// Helper function to get customer email from users table with fallback
async function getCustomerEmail(customerAccountId) {
  try {
    const accountResult = await queryAsync(
      'SELECT user_id, email FROM account_details WHERE account_id = ?',
      [customerAccountId]
    );

    if (accountResult.length === 0) {
      console.log(`⚠️ No account_details row found for customer account_id ${customerAccountId}`);
      return null;
    }

    const userId = accountResult[0].user_id;

    if (userId) {
      const userResult = await queryAsync(
        'SELECT email_id FROM users WHERE id = ?',
        [userId]
      );
      if (userResult.length > 0 && userResult[0].email_id) {
        console.log(`✅ Customer email from users table (id ${userId}): ${userResult[0].email_id}`);
        return userResult[0].email_id;
      }
      console.log(`⚠️ user_id ${userId} set on account_details but no email_id found in users table`);
    } else {
      console.log(`⚠️ account_details.user_id is NULL for account ${customerAccountId} — cannot link to users table`);
    }

    // Fallback: use account_details.email if the users-table link is missing
    if (accountResult[0].email) {
      console.log(`ℹ️ Falling back to account_details.email for customer ${customerAccountId}: ${accountResult[0].email}`);
      return accountResult[0].email;
    }

    console.log(`⚠️ No email found anywhere for customer account ${customerAccountId}`);
    return null;
  } catch (error) {
    console.error('❌ Error getting customer email:', error);
    return null;
  }
}

// Helper function to get full image URL
function getFullImageUrl(photoPath) {
  if (!photoPath) return null;
  
  // If already a full URL, return as is
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  
  // Get base URL from environment variable or use default
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:5001';
  
  // Ensure the path starts with /
  const normalizedPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  
  return `${baseUrl}${normalizedPath}`;
}

// Helper function to send email with photo (FIXED - using inline attachment for better compatibility)
async function sendVisitScheduleEmail(recipientEmail, recipientName, emailType, data) {
  try {
    const { 
      customerName, 
      warehouseName, 
      barcode, 
      productName, 
      scheduledDate, 
      scheduledTime, 
      salesmanName, 
      customerId,
      salesmanPhoto 
    } = data;
    
    let subject, html;
    let attachments = [];
    
    // Process photo if exists - use inline attachment for better email compatibility
    let photoHtml = '';
    let photoCid = '';
    
    if (salesmanPhoto) {
      try {
        // Get the full path to the photo file
        const photoPath = path.join(__dirname, '..', salesmanPhoto);
        
        // Check if file exists
        if (fs.existsSync(photoPath)) {
          // Generate a unique Content-ID for the image
          photoCid = `salesman_photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          
          // Read the file as base64
          const imageBuffer = fs.readFileSync(photoPath);
          const base64Image = imageBuffer.toString('base64');
          
          // Get the file extension
          const ext = path.extname(photoPath).toLowerCase().replace('.', '');
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                          ext === 'png' ? 'image/png' : 
                          ext === 'gif' ? 'image/gif' : 'image/jpeg';
          
          // Add as attachment with Content-ID
          attachments.push({
            filename: path.basename(photoPath),
            content: imageBuffer,
            cid: photoCid,
            contentType: mimeType
          });
          
          // Build photo HTML using the CID
          photoHtml = `
            <div style="text-align: center; margin: 15px 0;">
              <img src="cid:${photoCid}" alt="${salesmanName || 'Salesperson'}" 
                   style="max-width: 200px; max-height: 200px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
            </div>
          `;
          console.log(`✅ Photo attached as inline image with CID: ${photoCid}`);
        } else {
          console.log(`⚠️ Photo file not found at: ${photoPath}`);
          // Fallback to URL method
          const fullUrl = getFullImageUrl(salesmanPhoto);
          if (fullUrl) {
            photoHtml = `
              <div style="text-align: center; margin: 15px 0;">
                <img src="${fullUrl}" alt="${salesmanName || 'Salesperson'}" 
                     style="max-width: 200px; max-height: 200px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('❌ Error processing photo for email:', error);
        // Try URL fallback
        const fullUrl = getFullImageUrl(salesmanPhoto);
        if (fullUrl) {
          photoHtml = `
            <div style="text-align: center; margin: 15px 0;">
              <img src="${fullUrl}" alt="${salesmanName || 'Salesperson'}" 
                   style="max-width: 200px; max-height: 200px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
            </div>
          `;
        }
      }
    }
    
    if (emailType === 'customer') {
      subject = '📦 Warehouse Visit Scheduled - Jiyaa Jewels';
      
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Warehouse Visit Schedule</p>
          </div>
          
          <div style="padding: 20px 0;">
           <p style="font-size: 16px; color: #333;">Dear <strong>${recipientName || 'Customer'} Sir</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              A Sales visit has been scheduled for you. Please find the details below:
            </p>
            
            ${photoHtml}
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; width: 40%;">Salesperson Name</td>
                  <td style="padding: 8px 10px; color: #333;">${salesmanName || 'Not assigned yet'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Date</td>
                  <td style="padding: 8px 10px; color: #333;">${scheduledDate || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Time</td>
                  <td style="padding: 8px 10px; color: #333;">${scheduledTime || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Warehouse</td>
                  <td style="padding: 8px 10px; color: #333;">${warehouseName || 'N/A'}</td>
                </tr>
               
              </table>
            </div>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Please be available at the scheduled time. If you need to reschedule or have any questions, 
              please contact our support team.
            </p>
            
            <div style="background: #f0f7ff; padding: 12px; border-radius: 6px; border-left: 4px solid #4F46E5; margin: 15px 0;">
              <p style="font-size: 13px; color: #555; margin: 0;">
                <strong>📌 Note:</strong> Please bring this email with you for verification purposes.
              </p>
            </div>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing Jiyaa Jewels</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `;
    } else if (emailType === 'salesman') {
      subject = '📦 New Warehouse Visit Assignment - Jiyaa Jewels';
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">New Visit Assignment</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${recipientName || 'Salesperson'}</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              You have been assigned a new Customer visit. Please review the details below:
            </p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; width: 40%;">Customer</td>
                  <td style="padding: 8px 10px; color: #333;">${customerName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Customer ID</td>
                  <td style="padding: 8px 10px; color: #333;">${customerId || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Warehouse</td>
                  <td style="padding: 8px 10px; color: #333;">${warehouseName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Date</td>
                  <td style="padding: 8px 10px; color: #333;">${scheduledDate || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Time</td>
                  <td style="padding: 8px 10px; color: #333;">${scheduledTime || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Barcode</td>
                  <td style="padding: 8px 10px; color: #333; font-family: monospace;">${barcode || 'N/A'}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff3e0; padding: 12px; border-radius: 6px; border-left: 4px solid #FF9800; margin: 15px 0;">
              <p style="font-size: 13px; color: #555; margin: 0;">
                <strong>⚠️ Action Required:</strong> Please prepare for the visit and ensure you have all necessary materials.
              </p>
            </div>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              <strong>Customer Contact:</strong> Please reach out to the customer to confirm the visit.
            </p>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for your service</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER || "tharunkumarreddy1212@gmail.com",
      to: recipientEmail,
      subject: subject,
      html: html
    };
    
    // Add attachments if any
    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    
    await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent to ${recipientEmail} (${emailType})`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending email to ${recipientEmail}:`, error);
    return false;
  }
}

// Helper function to create notification and send email for customer (UPDATED - uses schedule ID as related_id)
async function createWarehouseScheduleNotification(
  customerAccountId, 
  warehouseId, 
  barcodes, 
  scheduledDate, 
  salesmanId, 
  salesmanName, 
  barcodeDetailsArray, 
  salesmanPhoto,
  scheduleIds
) {
  try {
    // Get customer details from account_details
    const customer = await queryAsync(
      'SELECT account_name, customer_id, email, mobile, user_id FROM account_details WHERE account_id = ?',
      [customerAccountId]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name, location FROM stock_points WHERE stock_point_id = ?',
      [warehouseId]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const customerId = customer.length > 0 ? customer[0].customer_id : 'N/A';
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
    
    // Get customer email
    const customerEmail = await getCustomerEmail(customerAccountId);
    
    // Build photo URL for notification
    let photoUrl = null;
    if (salesmanPhoto) {
      photoUrl = getFullImageUrl(salesmanPhoto);
    }
    
    // Process photo for email
    let photoHtml = '';
    let attachments = [];
    let photoCid = '';
    
    if (salesmanPhoto) {
      try {
        const photoPath = path.join(__dirname, '..', salesmanPhoto);
        if (fs.existsSync(photoPath)) {
          photoCid = `salesman_photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const imageBuffer = fs.readFileSync(photoPath);
          const ext = path.extname(photoPath).toLowerCase().replace('.', '');
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                          ext === 'png' ? 'image/png' : 
                          ext === 'gif' ? 'image/gif' : 'image/jpeg';
          
          attachments.push({
            filename: path.basename(photoPath),
            content: imageBuffer,
            cid: photoCid,
            contentType: mimeType
          });
          
          photoHtml = `
            <div style="text-align: center; margin: 15px 0;">
              <img src="cid:${photoCid}" alt="${salesmanName || 'Salesperson'}" 
                   style="max-width: 200px; max-height: 200px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
            </div>
          `;
        } else {
          const fullUrl = getFullImageUrl(salesmanPhoto);
          if (fullUrl) {
            photoHtml = `
              <div style="text-align: center; margin: 15px 0;">
                <img src="${fullUrl}" alt="${salesmanName || 'Salesperson'}" 
                     style="max-width: 200px; max-height: 200px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('❌ Error processing photo for email:', error);
      }
    }
    
    // Send email to customer
    if (customerEmail) {
      const subject = '📦 Warehouse Visit Scheduled - Jiyaa Jewels';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Warehouse Visit Schedule</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${customerName || 'Customer'} Sir</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              A Sales visit has been scheduled for you. Please find the details below:
            </p>
            
            ${photoHtml}
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; width: 40%;">Salesperson Name</td>
                  <td style="padding: 8px 10px; color: #333;">${salesmanName || 'Not assigned yet'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Date</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedDate || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Time</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedTime || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Warehouse</td>
                  <td style="padding: 8px 10px; color: #333;">${warehouseName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; vertical-align: top;">Barcodes</td>
                  <td style="padding: 8px 10px; color: #333;">
                    ${barcodes.map(b => `<div style="font-family: monospace; margin: 2px 0;">${b}</div>`).join('')}
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Please be available at the scheduled time. If you need to reschedule or have any questions, 
              please contact our support team.
            </p>
            
            <div style="background: #f0f7ff; padding: 12px; border-radius: 6px; border-left: 4px solid #4F46E5; margin: 15px 0;">
              <p style="font-size: 13px; color: #555; margin: 0;">
                <strong>📌 Note:</strong> Please bring this email with you for verification purposes.
              </p>
            </div>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing Jiyaa Jewels</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `;
      
      const mailOptions = {
        from: process.env.EMAIL_USER || "tharunkumarreddy1212@gmail.com",
        to: customerEmail,
        subject: subject,
        html: html
      };
      
      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }
      
      await transporter.sendMail(mailOptions);
      console.log(`✅ Single email sent to ${customerEmail} with ${barcodes.length} barcodes`);
    }
    
    // Use the first schedule ID as the related_id
    const relatedId = scheduleIds && scheduleIds.length > 0 ? scheduleIds[0] : customerAccountId;
    
    // Create notification with salesman photo URL in message
    const title = '📦 New Warehouse Visit Scheduled';
    const photoText = photoUrl ? ` [Salesperson Photo: ${photoUrl}]` : '';
    const message = `A Sales visit has been scheduled for you at ${warehouseName} on ${formattedDate} at ${formattedTime}. 
      ${barcodes.length} item(s) scheduled: ${barcodes.join(', ')}
      Salesperson: ${salesmanName || 'No salesperson assigned yet.'}
      Please be available at the scheduled time.${photoText}`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at, photo_url) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW(), ?)`,
      [customerAccountId, title, message, relatedId, photoUrl]
    );
    
    console.log(`✅ Single warehouse schedule notification sent to customer ${customerAccountId} with related_id: ${relatedId}`);
    
    // 👇 ADDED: Send push notification to customer
    await sendPushToUser(
      queryAsync, customerAccountId, 'customer',
      title, `Visit scheduled at ${warehouseName} on ${formattedDate} at ${formattedTime}`,
      '/customer-dashboard'
    );
    
    // Send notification to salesman if assigned
    if (salesmanId) {
      const salesmanTitle = '📦 New Warehouse Visit Assignment';
      const salesmanMessage = `You have been assigned to visit ${customerName} at ${warehouseName} on ${formattedDate} at ${formattedTime}.
        ${barcodes.length} item(s): ${barcodes.join(', ')}
        Customer: ${customerName} (${customerId})`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesmanId, salesmanTitle, salesmanMessage, relatedId]
      );
      
      // 👇 ADDED: Send push notification to salesman
      await sendPushToUser(
        queryAsync, salesmanId, 'salesman',
        salesmanTitle, `New visit assigned at ${warehouseName} on ${formattedDate} at ${formattedTime}`,
        '/salesman-dashboard'
      );
    }
    
    // Create notification for warehouse
    const warehouseTitle = '📦 New Customer Visit Scheduled';
    const warehouseMessage = `A new customer visit has been scheduled at your warehouse.
      Customer: ${customerName} (${customerId})
      Date: ${formattedDate} at ${formattedTime}
      ${barcodes.length} item(s): ${barcodes.join(', ')}
      Salesperson: ${salesmanName || 'Not assigned yet'}
      Please prepare for the customer visit.`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'warehouse', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [warehouseId, warehouseTitle, warehouseMessage, relatedId]
    );
    
    // 👇 ADDED: Send push notification to warehouse
    await sendPushToUser(
      queryAsync, warehouseId, 'warehouse',
      warehouseTitle, `New customer visit scheduled at your warehouse`,
      '/warehouse-dashboard'
    );
    
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
    
    // Format dates to IST (India Standard Time)
    const formattedSchedules = schedules.map(schedule => {
      // Helper to format date in IST
      const formatDateIST = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        // Format in IST
        return date.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      };
      
      // Helper to get ISO string in IST
      const getISOInIST = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        // Convert to IST and return as ISO string
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istDate = new Date(date.getTime() + istOffset);
        return istDate.toISOString().replace('Z', '+05:30');
      };
      
      return {
        ...schedule,
        
        // Original UTC dates (keep for reference)
        created_at_utc: schedule.created_at,
        updated_at_utc: schedule.updated_at,
        scheduled_date_utc: schedule.scheduled_date,
        
        // === FORMATTED DATES IN IST (Human Readable) ===
        created_at_ist: formatDateIST(schedule.created_at),
        updated_at_ist: formatDateIST(schedule.updated_at),
        scheduled_date_ist: formatDateIST(schedule.scheduled_date),
        
        // === ISO STRINGS IN IST (for API consumption) ===
        created_at_ist_iso: getISOInIST(schedule.created_at),
        updated_at_ist_iso: getISOInIST(schedule.updated_at),
        scheduled_date_ist_iso: getISOInIST(schedule.scheduled_date),
        
        // === Individual Date Components in IST ===
        scheduled_date_formatted: schedule.scheduled_date ? 
          new Date(schedule.scheduled_date).toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }) : null,
        scheduled_time: schedule.scheduled_date ? 
          new Date(schedule.scheduled_date).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : null,
          
        // For direct display in frontend
        display_date: schedule.scheduled_date ? 
          new Date(schedule.scheduled_date).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) : null
      };
    });
    
    console.log(`✅ Found ${formattedSchedules.length} schedules`);
    if (formattedSchedules.length > 0) {
      console.log(`📅 Latest schedule: ${formattedSchedules[0]?.scheduled_date_ist}`);
    }
    
    res.json(formattedSchedules);
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

// POST - Create new warehouse visit schedule with multiple barcodes and photo
router.post('/', upload.single('salesman_photo'), async (req, res) => {
  try {
    const { 
      customer_id, 
      warehouse_id, 
      barcodes, 
      scheduled_date, 
      salesman_id, 
      salesman_name,
      salesman_photo_path
    } = req.body;
    
    // Determine which photo to use:
    // 1. If a new file was uploaded, use it
    // 2. Otherwise, use the photo path from account-details (if provided)
    // 3. Otherwise, null
    let salesmanPhoto = null;
    if (req.file) {
      salesmanPhoto = `/uploads/salesman-photos/${req.file.filename}`;
      console.log('📸 New photo uploaded:', salesmanPhoto);
    } else if (salesman_photo_path) {
      salesmanPhoto = salesman_photo_path;
      console.log('📸 Using profile photo from account-details:', salesmanPhoto);
    }
    
    console.log('📝 Received data:', { 
      customer_id, 
      warehouse_id, 
      barcodes, 
      scheduled_date,
      salesman_id,
      salesman_name,
      salesmanPhoto,
      barcode_count: barcodes ? JSON.parse(barcodes).length : 0
    });
    
    // Parse barcodes from JSON string
    const parsedBarcodes = barcodes ? JSON.parse(barcodes) : [];
    
    // Validate required fields
    if (!customer_id || !warehouse_id || !parsedBarcodes || !parsedBarcodes.length || !scheduled_date) {
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
      'SELECT account_id, customer_id, account_name, account_group, user_id FROM account_details WHERE account_id = ?', 
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
    let salesmanPhotoToUse = salesmanPhoto;
    
    if (salesmanIdInt) {
      console.log(`🔍 Checking salesman with account_id: ${salesmanIdInt}`);
      const salesman = await queryAsync(
        'SELECT account_id, account_name, email, profile_photo FROM account_details WHERE account_id = ? AND account_group = ?',
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
      
      // If no photo was provided in the request, try to use the salesman's profile photo from account-details
      if (!salesmanPhotoToUse && salesman[0].profile_photo) {
        salesmanPhotoToUse = salesman[0].profile_photo;
        console.log(`📸 Using salesman profile photo from account-details: ${salesmanPhotoToUse}`);
      }
      console.log(`✅ Salesman validated: ${finalSalesmanName}`);
    }
    
    // Step 4: Validate each barcode exists in stock transfers for this warehouse
    const validBarcodes = [];
    const invalidBarcodes = [];
    const barcodeDetails = [];
    
    for (const barcode of parsedBarcodes) {
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
    
    // Step 6: Insert schedules for each barcode with salesman info and photo
    const insertedIds = [];
    for (const barcode of validBarcodes) {
      console.log(`📝 Inserting schedule for barcode: ${barcode}...`);
      
      const result = await queryAsync(
        `INSERT INTO visit_logs_warehouse_schedule 
         (customer_account_id, customer_id, warehouse_id, barcode, scheduled_date, salesman_id, salesman_name, salesman_photo, customer_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerIdInt, actualCustomerId, warehouseIdInt, barcode, scheduled_date, salesmanIdInt, finalSalesmanName, salesmanPhotoToUse, 'Pending']
      );
      insertedIds.push(result.insertId);
      console.log(`✅ Schedule inserted with ID: ${result.insertId} (customer_id: ${actualCustomerId}, salesman: ${finalSalesmanName || 'Not assigned'})`);
    }
    
    // Send SINGLE notification and SINGLE email for ALL barcodes
    await createWarehouseScheduleNotification(
      customerIdInt, 
      warehouseIdInt, 
      validBarcodes,
      scheduled_date, 
      salesmanIdInt, 
      finalSalesmanName,
      barcodeDetails,
      salesmanPhotoToUse,
      insertedIds
    );
    
    res.status(201).json({ 
      success: true, 
      message: `${validBarcodes.length} warehouse visits scheduled successfully with a single notification/email sent to customer, salesman, and warehouse`,
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

// Helper function for update notification with photo (UPDATED - INCLUDES SALESMAN PHOTO IN NOTIFICATION)
async function createWarehouseScheduleUpdateNotification(
  customerAccountId, 
  warehouseId, 
  barcodes, 
  scheduledDate, 
  salesmanId, 
  salesmanName, 
  oldSchedule, 
  barcodeDetailsArray,
  salesmanPhoto
) {
  try {
    const customer = await queryAsync(
      'SELECT account_name, customer_id, user_id FROM account_details WHERE account_id = ?',
      [customerAccountId]
    );
    
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouseId]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const customerId = customer.length > 0 ? customer[0].customer_id : 'N/A';
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
    
    const customerEmail = await getCustomerEmail(customerAccountId);
    
    // Build photo URL for notification
    let photoUrl = null;
    if (salesmanPhoto) {
      photoUrl = getFullImageUrl(salesmanPhoto);
    }
    
    // Process photo for email
    let photoHtml = '';
    let attachments = [];
    let photoCid = '';
    
    if (salesmanPhoto) {
      try {
        const photoPath = path.join(__dirname, '..', salesmanPhoto);
        if (fs.existsSync(photoPath)) {
          photoCid = `salesman_photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const imageBuffer = fs.readFileSync(photoPath);
          const ext = path.extname(photoPath).toLowerCase().replace('.', '');
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                          ext === 'png' ? 'image/png' : 
                          ext === 'gif' ? 'image/gif' : 'image/jpeg';
          
          attachments.push({
            filename: path.basename(photoPath),
            content: imageBuffer,
            cid: photoCid,
            contentType: mimeType
          });
          
          photoHtml = `
            <div style="text-align: center; margin: 15px 0;">
              <img src="cid:${photoCid}" alt="${salesmanName || 'Salesperson'}" 
                   style="max-width: 200px; max-height: 200px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
            </div>
          `;
        } else {
          const fullUrl = getFullImageUrl(salesmanPhoto);
          if (fullUrl) {
            photoHtml = `
              <div style="text-align: center; margin: 15px 0;">
                <img src="${fullUrl}" alt="${salesmanName || 'Salesperson'}" 
                     style="max-width: 200px; max-height: 200px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('❌ Error processing photo for update email:', error);
      }
    }
    
    const barcodeListHtml = barcodes.map(b => `<div style="font-family: monospace; margin: 2px 0;">${b}</div>`).join('');
    
    // Send email to customer
    if (customerEmail) {
      const subject = '📦 Warehouse Visit Updated - Jiyaa Jewels';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Visit Updated</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Your warehouse visit has been updated. Please review the new details below:
            </p>
            
            ${photoHtml}
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; width: 40%;">Salesperson</td>
                  <td style="padding: 8px 10px; color: #333;">${salesmanName || 'Not assigned yet'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Warehouse</td>
                  <td style="padding: 8px 10px; color: #333;">${warehouseName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Date</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Time</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; vertical-align: top;">Barcodes (${barcodes.length})</td>
                  <td style="padding: 8px 10px; color: #333;">${barcodeListHtml}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff3e0; padding: 12px; border-radius: 6px; border-left: 4px solid #FF9800; margin: 15px 0;">
              <p style="font-size: 13px; color: #555; margin: 0;">
                <strong>📌 Note:</strong> Please bring this email with you for verification purposes.
              </p>
            </div>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing Jiyaa Jewels</p>
          </div>
        </div>
      `;
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: subject,
        html: html
      };
      
      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }
      
      await transporter.sendMail(mailOptions);
    }
    
    // Create notification with salesman photo URL
    const title = '📦 Warehouse Visit Updated';
    const photoText = photoUrl ? ` [Salesperson Photo: ${photoUrl}]` : '';
    const message = `Your warehouse visit at ${warehouseName} has been updated to ${formattedDate} at ${formattedTime}.
      ${barcodes.length} item(s): ${barcodes.join(', ')}
      Salesperson: ${salesmanName || 'No salesperson assigned.'}${photoText}`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at, photo_url) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW(), ?)`,
      [customerAccountId, title, message, customerAccountId, photoUrl]
    );
    
    // 👇 ADDED: Send push notification to customer
    await sendPushToUser(
      queryAsync, customerAccountId, 'customer',
      title, `Visit updated at ${warehouseName} on ${formattedDate} at ${formattedTime}`,
      '/customer-dashboard'
    );
    
    // Send notification to salesman if assigned
    if (salesmanId) {
      const salesmanTitle = '📦 Warehouse Visit Assignment Updated';
      const salesmanMessage = `Your warehouse visit assignment has been updated.
        Customer: ${customerName}
        Warehouse: ${warehouseName}
        Date: ${formattedDate} at ${formattedTime}
        ${barcodes.length} item(s): ${barcodes.join(', ')}`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesmanId, salesmanTitle, salesmanMessage, customerAccountId]
      );
      
      // 👇 ADDED: Send push notification to salesman
      await sendPushToUser(
        queryAsync, salesmanId, 'salesman',
        salesmanTitle, `Assignment updated`,
        '/salesman-dashboard'
      );
    }
    
    // Create update notification for warehouse
    const warehouseTitle = '📦 Warehouse Visit Updated';
    const warehouseMessage = `A warehouse visit has been updated.
      Customer: ${customerName} (${customerId})
      Date: ${formattedDate} at ${formattedTime}
      ${barcodes.length} item(s): ${barcodes.join(', ')}
      Salesperson: ${salesmanName || 'Not assigned yet'}`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'warehouse', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [warehouseId, warehouseTitle, warehouseMessage, customerAccountId]
    );
    
    // 👇 ADDED: Send push notification to warehouse
    await sendPushToUser(
      queryAsync, warehouseId, 'warehouse',
      warehouseTitle, `A warehouse visit has been updated`,
      '/warehouse-dashboard'
    );
    
  } catch (error) {
    console.error('❌ Error creating warehouse update notification:', error);
  }
}

// PUT - Update warehouse visit schedule with photo
router.put('/:id', upload.single('salesman_photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_id, 
      warehouse_id, 
      barcodes, 
      scheduled_date, 
      status, 
      salesman_id, 
      salesman_name,
      salesman_photo_path
    } = req.body;
    
    // Determine which photo to use:
    // 1. If a new file was uploaded, use it
    // 2. Otherwise, use the photo path from account-details (if provided)
    // 3. Otherwise, fallback to existing photo
    let newPhoto = null;
    if (req.file) {
      newPhoto = `/uploads/salesman-photos/${req.file.filename}`;
      console.log('📸 New photo uploaded:', newPhoto);
    } else if (salesman_photo_path) {
      newPhoto = salesman_photo_path;
      console.log('📸 Using profile photo from account-details:', newPhoto);
    }
    
    console.log(`📝 Updating schedule ${id}:`, { 
      customer_id, 
      warehouse_id, 
      barcodes, 
      scheduled_date, 
      status, 
      salesman_id, 
      salesman_name,
      newPhoto
    });
    
    // Parse barcodes from JSON string if present
    const parsedBarcodes = barcodes ? JSON.parse(barcodes) : [];
    
    // Validate required fields
    if (!customer_id || !warehouse_id || !parsedBarcodes || !parsedBarcodes.length || !scheduled_date) {
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
    
    // Get the schedule to find the group
    const existingSchedule = await queryAsync(
      'SELECT * FROM visit_logs_warehouse_schedule WHERE id = ?', 
      [id]
    );
    
    if (existingSchedule.length === 0) {
      console.log(`❌ Schedule ${id} not found`);
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }
    
    const oldSchedule = existingSchedule[0];
    
    // Find ALL schedules in the same group
    const scheduleDate = new Date(oldSchedule.scheduled_date);
    const dateKey = scheduleDate.toISOString().split('T')[0];
    
    let groupSchedules;
    if (oldSchedule.salesman_id) {
      groupSchedules = await queryAsync(
        `SELECT * FROM visit_logs_warehouse_schedule 
         WHERE customer_account_id = ? 
           AND warehouse_id = ? 
           AND DATE(scheduled_date) = ? 
           AND salesman_id = ?
         ORDER BY id ASC`,
        [oldSchedule.customer_account_id, oldSchedule.warehouse_id, dateKey, oldSchedule.salesman_id]
      );
    } else {
      groupSchedules = await queryAsync(
        `SELECT * FROM visit_logs_warehouse_schedule 
         WHERE customer_account_id = ? 
           AND warehouse_id = ? 
           AND DATE(scheduled_date) = ? 
           AND salesman_id IS NULL
         ORDER BY id ASC`,
        [oldSchedule.customer_account_id, oldSchedule.warehouse_id, dateKey]
      );
    }
    
    console.log(`📋 Found ${groupSchedules.length} schedules in this group to update`);
    
    // Determine which photo to use
    let photoToUse = newPhoto || oldSchedule.salesman_photo;
    
    // If a new photo was uploaded or a photo path was provided, update all schedules in the group
    if (newPhoto) {
      // Delete all old photos in the group
      for (const schedule of groupSchedules) {
        if (schedule.salesman_photo) {
          const oldPhotoPath = path.join(__dirname, '..', schedule.salesman_photo);
          if (fs.existsSync(oldPhotoPath) && schedule.salesman_photo !== newPhoto) {
            fs.unlinkSync(oldPhotoPath);
            console.log(`🗑️ Deleted old photo: ${schedule.salesman_photo}`);
          }
        }
      }
      photoToUse = newPhoto;
    }
    
    // Validate customer exists
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
        'SELECT account_id, account_name, profile_photo FROM account_details WHERE account_id = ? AND account_group = ?',
        [salesmanIdInt, 'SALESMAN']
      );
      
      if (salesman.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid salesman selected. Account ID ${salesmanIdInt} is not a salesman.`
        });
      }
      finalSalesmanName = salesman_name || salesman[0].account_name;
      
      // If no photo was provided and the salesman has a profile photo, use it
      if (!newPhoto && !salesman_photo_path && !photoToUse && salesman[0].profile_photo) {
        photoToUse = salesman[0].profile_photo;
        console.log(`📸 Using salesman profile photo from account-details for update: ${photoToUse}`);
      }
    }
    
    // Delete ALL schedules in this group
    const groupIds = groupSchedules.map(s => s.id);
    if (groupIds.length > 0) {
      console.log(`🗑️ Deleting ${groupIds.length} schedules from group:`, groupIds);
      const placeholders = groupIds.map(() => '?').join(',');
      await queryAsync(
        `DELETE FROM visit_logs_warehouse_schedule WHERE id IN (${placeholders})`,
        groupIds
      );
    }
    
    // Get barcode details for all barcodes
    const barcodeDetails = [];
    for (const barcode of parsedBarcodes) {
      const detail = await queryAsync(`
        SELECT sti.PCode_BarCode, sti.product_name
        FROM stock_transfer_items sti
        WHERE sti.PCode_BarCode = ?
        LIMIT 1
      `, [barcode]);
      if (detail.length > 0) {
        barcodeDetails.push(detail[0]);
      }
    }
    
    // Insert new schedules for each barcode
    const insertedIds = [];
    for (const barcode of parsedBarcodes) {
      const result = await queryAsync(
        `INSERT INTO visit_logs_warehouse_schedule 
         (customer_account_id, customer_id, warehouse_id, barcode, scheduled_date, status, salesman_id, salesman_name, salesman_photo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerIdInt, actualCustomerId, warehouseIdInt, barcode, scheduled_date, status || 'scheduled', salesmanIdInt, finalSalesmanName, photoToUse]
      );
      insertedIds.push(result.insertId);
    }
    
    // Send update notification
    await createWarehouseScheduleUpdateNotification(
      customerIdInt,
      warehouseIdInt,
      parsedBarcodes,
      scheduled_date,
      salesmanIdInt,
      finalSalesmanName,
      oldSchedule,
      barcodeDetails,
      photoToUse
    );
    
    console.log(`✅ Schedule group updated successfully with ${insertedIds.length} new entries`);
    
    res.json({ 
      success: true, 
      message: `Warehouse schedule updated successfully with ${insertedIds.length} barcodes`,
      scheduleIds: insertedIds 
    });
    
  } catch (error) {
    console.error('❌ Error updating warehouse schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update warehouse schedule: ' + error.message 
    });
  }
});

// Helper function for deletion notification with photo
async function createWarehouseScheduleDeletionNotification(scheduleData) {
  try {
    const { customer_account_id, warehouse_id, barcode, scheduled_date, salesman_id, salesman_name, salesman_photo } = scheduleData;
    
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name, customer_id, user_id FROM account_details WHERE account_id = ?',
      [customer_account_id]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouse_id]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const customerId = customer.length > 0 ? customer[0].customer_id : 'N/A';
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
    
    // Get customer email from users table
    const customerEmail = await getCustomerEmail(customer_account_id);
    
    // Send email to customer if email exists
    if (customerEmail) {
      const subject = '❌ Warehouse Visit Cancelled - Jiyaa Jewels';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Visit Cancellation</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              We regret to inform you that your warehouse visit scheduled for <strong>${formattedDate} at ${formattedTime}</strong> 
              at <strong>${warehouseName}</strong> has been cancelled.
            </p>
            
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FF9800;">
              <p style="font-size: 14px; color: #555; margin: 0;">
                <strong>Barcode:</strong> ${barcode}<br>
                <strong>Reason:</strong> The visit has been cancelled by the administration.
              </p>
            </div>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              If you have any questions or would like to reschedule, please contact our support team.
            </p>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing Jiyaa Jewels</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `;
      
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: subject,
        html: html
      });
      
      console.log(`✅ Deletion email sent to customer ${customerEmail}`);
    }
    
    // Insert notification for customer
    const title = '❌ Warehouse Visit Cancelled';
    const message = `Your warehouse visit at ${warehouseName} scheduled for ${formattedDate} at ${formattedTime} has been cancelled.
      Barcode: ${barcode}
      Please contact us for more information.`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customer_account_id, title, message, customer_account_id]
    );
    
    console.log(`✅ Warehouse schedule deletion notification sent to customer ${customer_account_id}`);
    
    // 👇 ADDED: Send push notification to customer
    await sendPushToUser(
      queryAsync, customer_account_id, 'customer',
      title, `Your visit at ${warehouseName} was cancelled`,
      '/customer-dashboard'
    );
    
    // Send notification to salesman if assigned
    if (salesman_id) {
      // Get salesman email from account_details
      const salesmanEmail = await getSalesmanEmail(salesman_id);
      
      // Send email to salesman if email exists
      if (salesmanEmail) {
        const subject = '❌ Warehouse Visit Assignment Cancelled - Jiyaa Jewels';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
              <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
              <p style="color: #666; margin: 5px 0 0 0;">Assignment Cancellation</p>
            </div>
            
            <div style="padding: 20px 0;">
              <p style="font-size: 16px; color: #333;">Dear <strong>${salesman_name || 'Salesperson'}</strong>,</p>
              
              <p style="font-size: 15px; color: #444; line-height: 1.6;">
                Your warehouse visit assignment for customer <strong>${customerName}</strong> (${customerId}) 
                at <strong>${warehouseName}</strong> scheduled for <strong>${formattedDate} at ${formattedTime}</strong> 
                has been cancelled.
              </p>
              
              <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FF9800;">
                <p style="font-size: 14px; color: #555; margin: 0;">
                  <strong>Barcode:</strong> ${barcode}<br>
                  <strong>Reason:</strong> The visit has been cancelled by the administration.
                </p>
              </div>
            </div>
            
            <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
              <p style="margin: 0;">Thank you for your service</p>
            </div>
          </div>
        `;
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: salesmanEmail,
          subject: subject,
          html: html
        });
        
        console.log(`✅ Deletion email sent to salesman ${salesmanEmail}`);
      }
      
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
      
      // 👇 ADDED: Send push notification to salesman
      await sendPushToUser(
        queryAsync, salesman_id, 'salesman',
        salesmanTitle, `Assignment cancelled`,
        '/salesman-dashboard'
      );
    }
    
    // Create deletion notification for warehouse (NO EMAIL)
    const warehouseTitle = '❌ Customer Visit Cancelled';
    const warehouseMessage = `A customer visit at your warehouse has been cancelled.
      Customer: ${customerName} (${customerId})
      Date: ${formattedDate} at ${formattedTime}
      Barcode: ${barcode}`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'warehouse', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [warehouse_id, warehouseTitle, warehouseMessage, customer_account_id]
    );
    
    console.log(`✅ Warehouse schedule deletion notification sent to warehouse ${warehouse_id}`);
    
    // 👇 ADDED: Send push notification to warehouse
    await sendPushToUser(
      queryAsync, warehouse_id, 'warehouse',
      warehouseTitle, `Customer visit cancelled`,
      '/warehouse-dashboard'
    );
    
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
    
    // Delete photo file if exists
    if (scheduleData.salesman_photo) {
      const photoPath = path.join(__dirname, '..', scheduleData.salesman_photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        console.log(`🗑️ Deleted photo: ${scheduleData.salesman_photo}`);
      }
    }
    
    // Send deletion notifications
    await createWarehouseScheduleDeletionNotification(scheduleData);
    
    const result = await queryAsync(
      'DELETE FROM visit_logs_warehouse_schedule WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows > 0) {
      console.log(`✅ Schedule ${id} deleted successfully`);
    }
    
    res.json({ success: true, message: 'Warehouse schedule deleted successfully with notifications sent to customer, salesman, and warehouse (emails to customer and salesman only)' });
    
  } catch (error) {
    console.error('❌ Error deleting warehouse schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete warehouse schedule' 
    });
  }
});

// GET - Get barcodes for a specific warehouse/stock point (excluding already scheduled ones)
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
        AND sti.PCode_BarCode NOT IN (
          SELECT DISTINCT barcode 
          FROM visit_logs_warehouse_schedule 
          WHERE status = 'scheduled'
            AND barcode IS NOT NULL
            AND barcode != ''
        )
      ORDER BY st.transfer_date DESC
    `, [warehouseId, warehouseId]);
    
    console.log(`✅ Found ${barcodes.length} available barcodes (excluding already scheduled)`);
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

// Helper function for status change notification (warehouse gets only notification, no email)
async function createWarehouseScheduleStatusNotification(scheduleData, newStatus) {
  try {
    const { 
      customer_account_id, 
      warehouse_id, 
      barcode, 
      scheduled_date, 
      salesman_id, 
      salesman_name,
      salesman_photo 
    } = scheduleData;
    
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name, customer_id, user_id FROM account_details WHERE account_id = ?',
      [customer_account_id]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouse_id]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const customerId = customer.length > 0 ? customer[0].customer_id : 'N/A';
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
    
    let title, message, emailSubject, emailHtml;
    
    if (newStatus === 'completed') {
      title = '✅ Warehouse Visit Completed';
      message = `Your warehouse visit at ${warehouseName} has been marked as completed.
        Barcode: ${barcode}
        Thank you for your visit!`;
      
      emailSubject = '✅ Warehouse Visit Completed - Jiyaa Jewels';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Visit Completed</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Your warehouse visit at <strong>${warehouseName}</strong> has been successfully completed.
            </p>
            
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4CAF50;">
              <p style="font-size: 14px; color: #333; margin: 0;">
                <strong>Barcode:</strong> ${barcode}<br>
                <strong>Date:</strong> ${formattedDate}<br>
                <strong>Time:</strong> ${formattedTime}
              </p>
            </div>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Thank you for visiting Jiyaa Jewels. We hope you had a great experience!
            </p>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing Jiyaa Jewels</p>
          </div>
        </div>
      `;
    } else if (newStatus === 'cancelled') {
      title = '❌ Warehouse Visit Cancelled';
      message = `Your warehouse visit at ${warehouseName} has been cancelled.
        Barcode: ${barcode}
        Please contact us for more information.`;
      
      emailSubject = '❌ Warehouse Visit Cancelled - Jiyaa Jewels';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Visit Cancelled</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              We regret to inform you that your warehouse visit at <strong>${warehouseName}</strong> 
              scheduled for <strong>${formattedDate} at ${formattedTime}</strong> has been cancelled.
            </p>
            
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FF9800;">
              <p style="font-size: 14px; color: #555; margin: 0;">
                <strong>Barcode:</strong> ${barcode}
              </p>
            </div>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              If you have any questions, please contact our support team.
            </p>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing Jiyaa Jewels</p>
          </div>
        </div>
      `;
    } else {
      return; // No notification for 'scheduled' status
    }
    
    // Get customer email from users table
    const customerEmail = await getCustomerEmail(customer_account_id);
    
    // Send email to customer if email exists
    if (customerEmail && emailSubject && emailHtml) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: emailSubject,
        html: emailHtml
      });
      
      console.log(`✅ Status email sent to customer ${customerEmail}`);
    }
    
    // Insert notification for customer
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'customer', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [customer_account_id, title, message, customer_account_id]
    );
    
    console.log(`✅ Warehouse schedule status notification sent to customer ${customer_account_id}`);
    
    // 👇 ADDED: Send push notification to customer
    await sendPushToUser(
      queryAsync, customer_account_id, 'customer',
      title, message.split('\n')[0].trim(),
      '/customer-dashboard'
    );
    
    // Send notification to salesman if assigned
    if (salesman_id) {
      // Get salesman email from account_details
      const salesmanEmail = await getSalesmanEmail(salesman_id);
      
      if (salesmanEmail) {
        const salesmanSubject = newStatus === 'completed' 
          ? '✅ Warehouse Visit Completed - Jiyaa Jewels' 
          : '❌ Warehouse Visit Cancelled - Jiyaa Jewels';
        const salesmanHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
              <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
              <p style="color: #666; margin: 5px 0 0 0;">Visit Status Update</p>
            </div>
            
            <div style="padding: 20px 0;">
              <p style="font-size: 16px; color: #333;">Dear <strong>${salesman_name || 'Salesperson'}</strong>,</p>
              
              <p style="font-size: 15px; color: #444; line-height: 1.6;">
                The warehouse visit for customer <strong>${customerName}</strong> (${customerId}) 
                at <strong>${warehouseName}</strong> has been marked as <strong>${newStatus}</strong>.
              </p>
              
              <div style="background: ${newStatus === 'completed' ? '#e8f5e9' : '#fff3e0'}; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${newStatus === 'completed' ? '#4CAF50' : '#FF9800'};">
                <p style="font-size: 14px; color: #333; margin: 0;">
                  <strong>Barcode:</strong> ${barcode}<br>
                  <strong>Date:</strong> ${formattedDate}<br>
                  <strong>Time:</strong> ${formattedTime}
                </p>
              </div>
            </div>
            
            <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
              <p style="margin: 0;">Thank you for your service</p>
            </div>
          </div>
        `;
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: salesmanEmail,
          subject: salesmanSubject,
          html: salesmanHtml
        });
        
        console.log(`✅ Status email sent to salesman ${salesmanEmail}`);
      }
      
      const salesmanTitle = newStatus === 'completed' 
        ? '✅ Warehouse Visit Completed' 
        : '❌ Warehouse Visit Cancelled';
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
      
      // 👇 ADDED: Send push notification to salesman
      await sendPushToUser(
        queryAsync, salesman_id, 'salesman',
        salesmanTitle, `Visit status: ${newStatus}`,
        '/salesman-dashboard'
      );
    }
    
    // Create status notification for warehouse (NO EMAIL)
    const warehouseTitle = newStatus === 'completed' 
      ? '✅ Customer Visit Completed' 
      : '❌ Customer Visit Cancelled';
    const warehouseMessage = `Customer visit status updated to ${newStatus}.
      Customer: ${customerName} (${customerId})
      Warehouse: ${warehouseName}
      Barcode: ${barcode}`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'warehouse', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [warehouse_id, warehouseTitle, warehouseMessage, customer_account_id]
    );
    
    console.log(`✅ Warehouse schedule status notification sent to warehouse ${warehouse_id}`);
    
    // 👇 ADDED: Send push notification to warehouse
    await sendPushToUser(
      queryAsync, warehouse_id, 'warehouse',
      warehouseTitle, `Visit status: ${newStatus}`,
      '/warehouse-dashboard'
    );
    
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
    
    // Send status update notification (warehouse gets only notification)
    await createWarehouseScheduleStatusNotification(schedule[0], status);
    
    console.log(`✅ Schedule ${id} status updated to ${status}`);
    
    res.json({ 
      success: true, 
      message: `Schedule status updated to ${status} with notifications sent to customer, salesman, and warehouse (emails to customer and salesman only)` 
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

// Helper function for salesman assignment notification with photo
async function createSalesmanAssignmentNotification(scheduleData, salesmanId, salesmanName) {
  try {
    const { customer_account_id, warehouse_id, barcode, scheduled_date, salesman_photo } = scheduleData;
    
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name, customer_id, user_id FROM account_details WHERE account_id = ?',
      [customer_account_id]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouse_id]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const customerId = customer.length > 0 ? customer[0].customer_id : 'N/A';
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
    
    // Get customer email from users table
    const customerEmail = await getCustomerEmail(customer_account_id);
    
    // Build photo HTML if exists - using inline attachment approach
    let photoHtml = '';
    let attachments = [];
    let photoCid = '';
    
    if (salesman_photo) {
      try {
        const photoPath = path.join(__dirname, '..', salesman_photo);
        if (fs.existsSync(photoPath)) {
          photoCid = `salesman_photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const imageBuffer = fs.readFileSync(photoPath);
          const ext = path.extname(photoPath).toLowerCase().replace('.', '');
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                          ext === 'png' ? 'image/png' : 
                          ext === 'gif' ? 'image/gif' : 'image/jpeg';
          
          attachments.push({
            filename: path.basename(photoPath),
            content: imageBuffer,
            cid: photoCid,
            contentType: mimeType
          });
          
          photoHtml = `
            <div style="text-align: center; margin: 15px 0;">
              <img src="cid:${photoCid}" alt="${salesmanName}" 
                   style="max-width: 150px; max-height: 150px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
            </div>
          `;
        } else {
          // Fallback to URL
          const fullUrl = getFullImageUrl(salesman_photo);
          if (fullUrl) {
            photoHtml = `
              <div style="text-align: center; margin: 15px 0;">
                <img src="${fullUrl}" alt="${salesmanName}" 
                     style="max-width: 150px; max-height: 150px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('❌ Error processing photo for assignment email:', error);
        const fullUrl = getFullImageUrl(salesman_photo);
        if (fullUrl) {
          photoHtml = `
            <div style="text-align: center; margin: 15px 0;">
              <img src="${fullUrl}" alt="${salesmanName}" 
                   style="max-width: 150px; max-height: 150px; border-radius: 50%; border: 3px solid #4F46E5; object-fit: cover;" />
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Your Salesperson</p>
            </div>
          `;
        }
      }
    }
    
    // Send email to customer if email exists
    if (customerEmail) {
      const subject = '👤 Salesperson Assigned - Jiyaa Jewels';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Salesperson Assigned</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              <strong>${salesmanName}</strong> has been assigned as your salesperson for your warehouse visit.
            </p>
            
            ${photoHtml}
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; width: 40%;">Salesperson</td>
                  <td style="padding: 8px 10px; color: #333;">${salesmanName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Warehouse</td>
                  <td style="padding: 8px 10px; color: #333;">${warehouseName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Barcode</td>
                  <td style="padding: 8px 10px; color: #333; font-family: monospace;">${barcode}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Date</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Time</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedTime}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Your salesperson will assist you during your visit.
            </p>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing Jiyaa Jewels</p>
          </div>
        </div>
      `;
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: subject,
        html: html
      };
      
      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }
      
      await transporter.sendMail(mailOptions);
      
      console.log(`✅ Salesman assignment email sent to customer ${customerEmail}`);
    }
    
    // Notification to customer
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
    
    // 👇 ADDED: Send push notification to customer
    await sendPushToUser(
      queryAsync, customer_account_id, 'customer',
      customerTitle, `${salesmanName} assigned as your salesperson`,
      '/customer-dashboard'
    );
    
    // Get salesman email from account_details
    const salesmanEmail = await getSalesmanEmail(salesmanId);
    
    // Send email to salesman if email exists
    if (salesmanEmail) {
      const subject = '👤 New Salesperson Assignment - Jiyaa Jewels';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">New Assignment</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${salesmanName}</strong>,</p>
            
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              You have been assigned as the salesperson for customer <strong>${customerName}</strong> (${customerId}).
            </p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555; width: 40%;">Customer</td>
                  <td style="padding: 8px 10px; color: #333;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Customer ID</td>
                  <td style="padding: 8px 10px; color: #333;">${customerId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Warehouse</td>
                  <td style="padding: 8px 10px; color: #333;">${warehouseName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Barcode</td>
                  <td style="padding: 8px 10px; color: #333; font-family: monospace;">${barcode}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Date</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 10px; font-weight: bold; color: #555;">Time</td>
                  <td style="padding: 8px 10px; color: #333;">${formattedTime}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff3e0; padding: 12px; border-radius: 6px; border-left: 4px solid #FF9800; margin: 15px 0;">
              <p style="font-size: 13px; color: #555; margin: 0;">
                <strong>⚠️ Action Required:</strong> Please prepare for the visit and ensure you have all necessary materials.
              </p>
            </div>
          </div>
          
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for your service</p>
          </div>
        </div>
      `;
      
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: salesmanEmail,
        subject: subject,
        html: html
      });
      
      console.log(`✅ Salesman assignment email sent to salesman ${salesmanEmail}`);
    }
    
    // Notification to salesman
    const salesmanTitle = '👤 New Salesperson Assignment';
    const salesmanMessage = `You have been assigned to visit ${customerName} at ${warehouseName} on ${formattedDate} at ${formattedTime}.
      Barcode: ${barcode}
      Customer: ${customerName} (${customerId})`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [salesmanId, salesmanTitle, salesmanMessage, customer_account_id]
    );
    
    console.log(`✅ Salesman assignment notification sent to salesman ${salesmanId}`);
    
    // 👇 ADDED: Send push notification to salesman
    await sendPushToUser(
      queryAsync, salesmanId, 'salesman',
      salesmanTitle, `New assignment: ${customerName}`,
      '/salesman-dashboard'
    );
    
    // NEW: Create assignment notification for warehouse (NO EMAIL)
    const warehouseTitle = '👤 Salesperson Assigned';
    const warehouseMessage = `A salesperson has been assigned for a customer visit at your warehouse.
      Salesperson: ${salesmanName}
      Customer: ${customerName} (${customerId})
      Date: ${formattedDate} at ${formattedTime}
      Barcode: ${barcode}`;
    
    await queryAsync(
      `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
       VALUES (?, 'warehouse', ?, ?, 'warehouse_schedule', ?, NOW())`,
      [warehouse_id, warehouseTitle, warehouseMessage, customer_account_id]
    );
    
    console.log(`✅ Salesman assignment notification sent to warehouse ${warehouse_id}`);
    
    // 👇 ADDED: Send push notification to warehouse
    await sendPushToUser(
      queryAsync, warehouse_id, 'warehouse',
      warehouseTitle, `Salesperson assigned for a customer visit`,
      '/warehouse-dashboard'
    );
    
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
    
    // Send salesman assignment notification (warehouse gets only notification)
    await createSalesmanAssignmentNotification(existing[0], salesman_id, finalSalesmanName);
    
    console.log(`✅ Salesman assigned to schedule ${id} successfully`);
    
    res.json({
      success: true,
      message: 'Salesman assigned successfully with notifications sent to customer, salesman, and warehouse (emails to customer and salesman only)',
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

// PUT - Update customer status for a schedule (Available/Not Available)
// This will update ALL schedules with the same scheduled_date
router.put('/:id/customer-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_status } = req.body;
    
    console.log(`📝 Updating customer status for schedule ${id} to ${customer_status}...`);
    
    if (!customer_status || !['Scheduled', 'Available', 'Not Available'].includes(customer_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer_status. Must be Scheduled, Available, or Not Available'
      });
    }
    
    // Get schedule details before updating
    const schedule = await queryAsync(
      'SELECT * FROM visit_logs_warehouse_schedule WHERE id = ?',
      [id]
    );
    
    if (schedule.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    const scheduleData = schedule[0];
    
    // Get ALL schedules for this customer with the same scheduled_date
    // This ensures all products scheduled for the same date get updated together
    const dateKey = new Date(scheduleData.scheduled_date).toISOString().split('T')[0];
    
    const relatedSchedules = await queryAsync(
      `SELECT * FROM visit_logs_warehouse_schedule 
       WHERE customer_account_id = ? 
         AND DATE(scheduled_date) = ?
         AND status = 'scheduled'
       ORDER BY id ASC`,
      [scheduleData.customer_account_id, dateKey]
    );
    
    console.log(`📋 Found ${relatedSchedules.length} schedules with the same scheduled_date (${dateKey})`);
    
    // Update ALL schedules in this group
    if (relatedSchedules.length > 0) {
      const ids = relatedSchedules.map(s => s.id);
      const placeholders = ids.map(() => '?').join(',');
      
      await queryAsync(
        `UPDATE visit_logs_warehouse_schedule 
         SET customer_status = ?, updated_at = NOW() 
         WHERE id IN (${placeholders})`,
        [customer_status, ...ids]
      );
      
      console.log(`✅ Updated ${ids.length} schedules to ${customer_status}:`, ids);
    } else {
      // Fallback: just update the single schedule
      await queryAsync(
        `UPDATE visit_logs_warehouse_schedule 
         SET customer_status = ?, updated_at = NOW() 
         WHERE id = ?`,
        [customer_status, id]
      );
      console.log(`✅ Updated single schedule ${id} to ${customer_status}`);
    }
    
    // Send notification using the first schedule's data
    if (customer_status === 'Available') {
      await createCustomerAvailabilityNotification(scheduleData, 'available');
    }
    
    res.json({
      success: true,
      message: `${relatedSchedules.length || 1} schedule(s) updated to ${customer_status}`,
      data: {
        customer_status: customer_status,
        updated_count: relatedSchedules.length || 1,
        schedule_ids: relatedSchedules.map(s => s.id) || [id]
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating customer status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer status: ' + error.message
    });
  }
});

// PUT - Update customer status to Not Available with reschedule details
// This will update ALL schedules with the same scheduled_date
router.put('/:id/not-available-reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { reschedule_date, reschedule_notes } = req.body;
    
    console.log(`📝 Updating schedule ${id} to Not Available with reschedule...`);
    
    if (!reschedule_date) {
      return res.status(400).json({
        success: false,
        message: 'Reschedule date and time are required'
      });
    }
    
    // Get schedule details before updating
    const schedule = await queryAsync(
      'SELECT * FROM visit_logs_warehouse_schedule WHERE id = ?',
      [id]
    );
    
    if (schedule.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    const scheduleData = schedule[0];
    
    // Get ALL schedules for this customer with the same scheduled_date
    const dateKey = new Date(scheduleData.scheduled_date).toISOString().split('T')[0];
    
    const relatedSchedules = await queryAsync(
      `SELECT * FROM visit_logs_warehouse_schedule 
       WHERE customer_account_id = ? 
         AND DATE(scheduled_date) = ?
         AND status = 'scheduled'
       ORDER BY id ASC`,
      [scheduleData.customer_account_id, dateKey]
    );
    
    console.log(`📋 Found ${relatedSchedules.length} schedules with the same scheduled_date (${dateKey})`);
    
    // Update ALL schedules in this group
    if (relatedSchedules.length > 0) {
      const ids = relatedSchedules.map(s => s.id);
      const placeholders = ids.map(() => '?').join(',');
      
      await queryAsync(
        `UPDATE visit_logs_warehouse_schedule 
         SET customer_status = 'Not Available', 
             reschedule_date = ?,
             reschedule_notes = ?,
             updated_at = NOW() 
         WHERE id IN (${placeholders})`,
        [reschedule_date, reschedule_notes || 'Customer requested reschedule', ...ids]
      );
      
      console.log(`✅ Updated ${ids.length} schedules to Not Available with reschedule:`, ids);
    } else {
      // Fallback: just update the single schedule
      await queryAsync(
        `UPDATE visit_logs_warehouse_schedule 
         SET customer_status = 'Not Available', 
             reschedule_date = ?,
             reschedule_notes = ?,
             updated_at = NOW() 
         WHERE id = ?`,
        [reschedule_date, reschedule_notes || 'Customer requested reschedule', id]
      );
      console.log(`✅ Updated single schedule ${id} to Not Available with reschedule`);
    }
    
    // Create notification for Not Available with reschedule using the first schedule's data
    await createCustomerAvailabilityNotification(
      scheduleData, 
      'not_available', 
      reschedule_date, 
      reschedule_notes
    );
    
    res.json({
      success: true,
      message: `${relatedSchedules.length || 1} schedule(s) marked as Not Available with reschedule`,
      data: {
        customer_status: 'Not Available',
        reschedule_date: reschedule_date,
        reschedule_notes: reschedule_notes,
        updated_count: relatedSchedules.length || 1,
        schedule_ids: relatedSchedules.map(s => s.id) || [id]
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating with reschedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update with reschedule: ' + error.message
    });
  }
});

// Helper function for customer availability notification
async function createCustomerAvailabilityNotification(scheduleData, status, rescheduleDate = null, rescheduleNotes = null) {
  try {
    const { 
      customer_account_id, 
      warehouse_id, 
      barcode, 
      scheduled_date, 
      salesman_id, 
      salesman_name,
      salesman_photo 
    } = scheduleData;
    
    // Get customer details
    const customer = await queryAsync(
      'SELECT account_name, customer_id FROM account_details WHERE account_id = ?',
      [customer_account_id]
    );
    
    // Get warehouse details
    const warehouse = await queryAsync(
      'SELECT stock_point_name FROM stock_points WHERE stock_point_id = ?',
      [warehouse_id]
    );
    
    const customerName = customer.length > 0 ? customer[0].account_name : 'Customer';
    const customerId = customer.length > 0 ? customer[0].customer_id : 'N/A';
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
    
    let title, message, emailSubject, emailHtml;
    
    if (status === 'available') {
      title = '✅ Customer Available for Visit';
      message = `Customer ${customerName} has confirmed availability for the warehouse visit at ${warehouseName} on ${formattedDate} at ${formattedTime}.
        Barcode: ${barcode}
        Salesperson: ${salesman_name || 'Not assigned'}`;
      
      emailSubject = '✅ Customer Available - Jiyaa Jewels';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Customer Available</p>
          </div>
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${salesman_name || 'Salesperson'}</strong>,</p>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Customer <strong>${customerName}</strong> is available for the scheduled warehouse visit.
            </p>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4CAF50;">
              <p style="font-size: 14px; color: #333; margin: 0;">
                <strong>Customer:</strong> ${customerName} (${customerId})<br>
                <strong>Warehouse:</strong> ${warehouseName}<br>
                <strong>Barcode:</strong> ${barcode}<br>
                <strong>Date:</strong> ${formattedDate}<br>
                <strong>Time:</strong> ${formattedTime}
              </p>
            </div>
          </div>
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for your service</p>
          </div>
        </div>
      `;
      
      // Send email to salesman
      if (salesman_id) {
        const salesmanEmail = await getSalesmanEmail(salesman_id);
        if (salesmanEmail) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: salesmanEmail,
            subject: emailSubject,
            html: emailHtml
          });
          console.log(`✅ Availability email sent to salesman ${salesmanEmail}`);
        }
      }
      
      // Notification to salesman
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesman_id, title, message, customer_account_id]
      );
      
      // 👇 ADDED: Send push notification to salesman
      await sendPushToUser(
        queryAsync, salesman_id, 'salesman',
        title, `${customerName} confirmed availability`,
        '/salesman-dashboard'
      );
      
      // Notification to warehouse
      const warehouseTitle = '✅ Customer Available for Visit';
      const warehouseMessage = `Customer ${customerName} (${customerId}) is available for the visit at your warehouse.
        Date: ${formattedDate} at ${formattedTime}
        Barcode: ${barcode}`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'warehouse', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [warehouse_id, warehouseTitle, warehouseMessage, customer_account_id]
      );
      
      // 👇 ADDED: Send push notification to warehouse
      await sendPushToUser(
        queryAsync, warehouse_id, 'warehouse',
        warehouseTitle, `${customerName} confirmed availability`,
        '/warehouse-dashboard'
      );
      
    } else if (status === 'not_available') {
      const rescheduleDateTime = rescheduleDate ? new Date(rescheduleDate) : null;
      const rescheduleFormattedDate = rescheduleDateTime ? rescheduleDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'N/A';
      const rescheduleFormattedTime = rescheduleDateTime ? rescheduleDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'N/A';
      
      title = '⚠️ Customer Not Available - Reschedule Requested';
      message = `Customer ${customerName} is not available for the scheduled visit at ${warehouseName} on ${formattedDate} at ${formattedTime}.
        Reschedule requested for: ${rescheduleFormattedDate} at ${rescheduleFormattedTime}
        Barcode: ${barcode}
        Notes: ${rescheduleNotes || 'No additional notes'}`;
      
      emailSubject = '⚠️ Customer Not Available - Reschedule Requested - Jiyaa Jewels';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
            <h2 style="color: #4F46E5; margin: 0;">Jiyaa Jewels</h2>
            <p style="color: #666; margin: 5px 0 0 0;">Reschedule Requested</p>
          </div>
          <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${salesman_name || 'Salesperson'}</strong>,</p>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Customer <strong>${customerName}</strong> is not available for the scheduled visit and has requested a reschedule.
            </p>
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FF9800;">
              <p style="font-size: 14px; color: #333; margin: 0;">
                <strong>Customer:</strong> ${customerName} (${customerId})<br>
                <strong>Warehouse:</strong> ${warehouseName}<br>
                <strong>Barcode:</strong> ${barcode}<br>
                <strong>Original Date:</strong> ${formattedDate}<br>
                <strong>Original Time:</strong> ${formattedTime}<br>
                <strong>Requested Reschedule:</strong> ${rescheduleFormattedDate} at ${rescheduleFormattedTime}<br>
                <strong>Notes:</strong> ${rescheduleNotes || 'No additional notes'}
              </p>
            </div>
            <p style="font-size: 15px; color: #444; line-height: 1.6;">
              Please coordinate with the customer to confirm the new visit time.
            </p>
          </div>
          <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #888; font-size: 13px;">
            <p style="margin: 0;">Thank you for your service</p>
          </div>
        </div>
      `;
      
      // Send email to salesman
      if (salesman_id) {
        const salesmanEmail = await getSalesmanEmail(salesman_id);
        if (salesmanEmail) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: salesmanEmail,
            subject: emailSubject,
            html: emailHtml
          });
          console.log(`✅ Reschedule email sent to salesman ${salesmanEmail}`);
        }
      }
      
      // Notification to salesman
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'salesman', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [salesman_id, title, message, customer_account_id]
      );
      
      // 👇 ADDED: Send push notification to salesman
      await sendPushToUser(
        queryAsync, salesman_id, 'salesman',
        title, `${customerName} requested reschedule`,
        '/salesman-dashboard'
      );
      
      // Notification to warehouse
      const warehouseTitle = '⚠️ Customer Not Available - Reschedule Requested';
      const warehouseMessage = `Customer ${customerName} (${customerId}) is not available for the visit at your warehouse.
        Original Date: ${formattedDate} at ${formattedTime}
        Requested Reschedule: ${rescheduleFormattedDate} at ${rescheduleFormattedTime}
        Barcode: ${barcode}`;
      
      await queryAsync(
        `INSERT INTO notifications (user_id, user_type, title, message, type, related_id, created_at) 
         VALUES (?, 'warehouse', ?, ?, 'warehouse_schedule', ?, NOW())`,
        [warehouse_id, warehouseTitle, warehouseMessage, customer_account_id]
      );
      
      // 👇 ADDED: Send push notification to warehouse
      await sendPushToUser(
        queryAsync, warehouse_id, 'warehouse',
        warehouseTitle, `${customerName} requested reschedule`,
        '/warehouse-dashboard'
      );
    }
    
  } catch (error) {
    console.error('❌ Error creating customer availability notification:', error);
  }
}

// Helper function to get salesman email
async function getSalesmanEmail(salesmanId) {
  try {
    const result = await queryAsync(
      'SELECT email, user_id FROM account_details WHERE account_id = ?',
      [salesmanId]
    );
    
    if (result.length === 0) return null;
    
    if (result[0].email) {
      return result[0].email;
    }
    
    // Try to get from users table
    if (result[0].user_id) {
      const userResult = await queryAsync(
        'SELECT email_id FROM users WHERE id = ?',
        [result[0].user_id]
      );
      if (userResult.length > 0 && userResult[0].email_id) {
        return userResult[0].email_id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting salesman email:', error);
    return null;
  }
}


// In visitLogsWarehouseRoutes.js or create a new test route file

// Test endpoint to send a test push notification
router.post('/test-push/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType = 'customer' } = req.body;
    
    console.log(`🧪 Sending test push to ${userType} ${userId}`);
    
    await sendPushToUser(
      queryAsync,
      userId,
      userType,
      '🧪 Test Notification',
      'This is a test push notification from Jiyaa Jewels',
      '/customer-dashboard'
    );
    
    res.json({ 
      success: true, 
      message: 'Test push sent successfully',
      userId,
      userType
    });
  } catch (error) {
    console.error('❌ Test push error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;