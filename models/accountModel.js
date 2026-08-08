// models/accountModel.js
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Check if it's a profile photo or customer image
    let uploadDir = 'uploads/customer_images';
    if (file.fieldname === 'profile_photo') {
      uploadDir = 'uploads/profile_photos';
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'profile_photo' ? 'profile-' : 'customer-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Function to generate next customer ID (only for CUSTOMERS, not for SALESMAN)
const generateCustomerId = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT customer_id FROM account_details WHERE account_group = 'CUSTOMERS' AND customer_id IS NOT NULL ORDER BY account_id DESC LIMIT 1";
    
    db.query(sql, (err, results) => {
      if (err) {
        console.error('Error generating customer ID:', err);
        resolve(`CUST-${Date.now()}`);
        return;
      }
      
      let nextNumber = 1;
      if (results && results.length > 0 && results[0].customer_id) {
        const match = results[0].customer_id.match(/CUST-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      resolve(`CUST-${String(nextNumber).padStart(3, '0')}`);
    });
  });
};

// Insert new account record - UPDATED with district and profile_photo
const createAccount = async (data, files) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate customer_id only for CUSTOMERS group, not for SALESMAN
      let customerId = null;
      let userId = data.user_id || null;
      
      if (data.account_group === 'CUSTOMERS') {
        customerId = await generateCustomerId();
      }
      
      // Handle images - files is an object with field names as keys
      let imageData = null;
      if (files && files.images && files.images.length > 0) {
        const images = files.images.map(file => ({
          filename: file.filename,
          url: `/uploads/customer_images/${file.filename}`
        }));
        imageData = JSON.stringify(images);
      }
      
      // Handle profile photo (for SALESMAN registration)
      let profilePhotoPath = null;
      if (files && files.profile_photo && files.profile_photo.length > 0) {
        const profilePhoto = files.profile_photo[0];
        profilePhotoPath = `/uploads/profile_photos/${profilePhoto.filename}`;
      }
      
      // UPDATED: Added district and profile_photo columns (34 columns total)
      const sql = `INSERT INTO account_details (
          account_name, print_name, account_group, op_bal, metal_balance, dr_cr,
          address1, address2, city, district, pincode, state, state_code,
          phone, mobile, contact_person, email, birthday, anniversary,
          bank_account_no, bank_name, ifsc_code, branch, gst_in, aadhar_card,
          pan_card, religion, images, customer_id, user_id, password,
          duty_start_time, duty_end_time, profile_photo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
          data.account_name, 
          data.print_name, 
          data.account_group, 
          data.op_bal || null, 
          data.metal_balance || null, 
          data.dr_cr || null,
          data.address1 || null, 
          data.address2 || null, 
          data.city || null,
          data.district || null,
          data.pincode || null, 
          data.state || null, 
          data.state_code || null,
          data.phone || null, 
          data.mobile || null, 
          data.contact_person || null, 
          data.email || null, 
          data.birthday || null, 
          data.anniversary || null,
          data.bank_account_no || null, 
          data.bank_name || null, 
          data.ifsc_code || null, 
          data.branch || null, 
          data.gst_in || null, 
          data.aadhar_card || null, 
          data.pan_card || null, 
          data.religion || null, 
          imageData, 
          customerId, 
          userId, 
          data.password || null,
          data.duty_start_time || null,
          data.duty_end_time || null,
          profilePhotoPath // New profile_photo field
      ];

      console.log('Executing SQL with values:', values);
      console.log('Values count:', values.length);

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve({ insertId: result.insertId, customer_id: customerId, user_id: userId });
        }
      });
    } catch (error) {
      console.error('Error in createAccount:', error);
      reject(error);
    }
  });
};

// Get all accounts
const getAllAccounts = (callback) => {
    const sql = 'SELECT * FROM account_details ORDER BY account_id DESC';
    db.query(sql, callback);
};

// Get account by ID
const getAccountById = (id, callback) => {
    const sql = 'SELECT * FROM account_details WHERE account_id = ?';
    db.query(sql, [id], callback);
};

// Get salesman by email
const getSalesmanByEmail = (email, callback) => {
    const sql = 'SELECT * FROM account_details WHERE email = ? AND account_group = "SALESMAN"';
    db.query(sql, [email], callback);
};

// Check duty hours for salesman by account_id
const checkDutyHoursByAccountId = (accountId, callback) => {
    const sql = 'SELECT account_id as id, account_group as role, duty_start_time, duty_end_time, account_name as full_name, email, profile_photo FROM account_details WHERE account_id = ? AND account_group = "SALESMAN"';
    db.query(sql, [accountId], callback);
};

// Update account by ID - UPDATED with district and profile_photo
const updateAccount = (id, data, files, imagesToKeep, callback) => {
    db.query('SELECT images, profile_photo FROM account_details WHERE account_id = ?', [id], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        
        let existingImages = [];
        if (results[0]?.images) {
            try {
                existingImages = JSON.parse(results[0].images);
            } catch(e) {
                existingImages = [];
            }
        }
        
        let imagesToKeepArray = [];
        if (imagesToKeep) {
            try {
                imagesToKeepArray = JSON.parse(imagesToKeep);
            } catch(e) {
                imagesToKeepArray = [];
            }
        }
        
        const keptImages = existingImages.filter(img => imagesToKeepArray.includes(img.filename));
        
        let newImages = [];
        if (files && files.images && files.images.length > 0) {
            newImages = files.images.map(file => ({
                filename: file.filename,
                url: `/uploads/customer_images/${file.filename}`
            }));
        }
        
        const allImages = [...keptImages, ...newImages];
        const imageData = allImages.length > 0 ? JSON.stringify(allImages) : null;
        
        // Handle profile photo update
        let profilePhotoPath = results[0]?.profile_photo || null;
        if (files && files.profile_photo && files.profile_photo.length > 0) {
            const profilePhoto = files.profile_photo[0];
            profilePhotoPath = `/uploads/profile_photos/${profilePhoto.filename}`;
        }
        
        // UPDATED: Added district and profile_photo columns
        const sql = `UPDATE account_details SET 
            account_name = ?, print_name = ?, account_group = ?, op_bal = ?, metal_balance = ?, dr_cr = ?,
            address1 = ?, address2 = ?, city = ?, district = ?, pincode = ?, state = ?, state_code = ?,
            phone = ?, mobile = ?, contact_person = ?, email = ?, birthday = ?, anniversary = ?,
            bank_account_no = ?, bank_name = ?, ifsc_code = ?, branch = ?, gst_in = ?, aadhar_card = ?, 
            pan_card = ?, religion = ?, images = ?, profile_photo = ?
        WHERE account_id = ?`;

        const values = [
            data.account_name, data.print_name, data.account_group, data.op_bal || null, 
            data.metal_balance || null, data.dr_cr || null,
            data.address1 || null, data.address2 || null, data.city || null,
            data.district || null,
            data.pincode || null, data.state || null, data.state_code || null,
            data.phone || null, data.mobile || null, data.contact_person || null, 
            data.email || null, data.birthday || null, data.anniversary || null,
            data.bank_account_no || null, data.bank_name || null, data.ifsc_code || null, 
            data.branch || null, data.gst_in || null, data.aadhar_card || null, 
            data.pan_card || null, data.religion || null, imageData, profilePhotoPath, id
        ];

        db.query(sql, values, callback);
    });
};

// Delete account by ID
const deleteAccount = (id, callback) => {
    db.query('SELECT images, profile_photo FROM account_details WHERE account_id = ?', [id], (err, results) => {
        if (!err && results[0]) {
            // Delete customer images
            if (results[0].images) {
                try {
                    const images = JSON.parse(results[0].images);
                    images.forEach(image => {
                        const filePath = path.join(__dirname, '../uploads/customer_images', image.filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    });
                } catch(e) {}
            }
            
            // Delete profile photo
            if (results[0].profile_photo) {
                const fileName = results[0].profile_photo.split('/').pop();
                const filePath = path.join(__dirname, '../uploads/profile_photos', fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        
        const sql = 'DELETE FROM account_details WHERE account_id = ?';
        db.query(sql, [id], callback);
    });
};

module.exports = {
    createAccount,
    getAllAccounts,
    getAccountById,
    updateAccount,
    deleteAccount,
    upload,
    getSalesmanByEmail,
    checkDutyHoursByAccountId
};