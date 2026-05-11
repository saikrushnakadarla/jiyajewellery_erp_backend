// const accountDetailsModel = require('../models/Accountdetails');

// // Controller to insert data into account_details table
// const addAccountDetails = (req, res) => {
//     const data = req.body;

//     accountDetailsModel.insertAccountDetails(data, (err, result) => {
//         if (err) {
//             console.error('Error inserting data:', err.message);
//             return res.status(500).json({ message: 'Failed to insert data', error: err.message });
//         }
//         res.status(200).json({ message: 'Data inserted successfully', id: result.insertId });
//     });
// };

// // Controller to fetch all account details
// const getAllAccountDetails = (req, res) => {
//     accountDetailsModel.getAllAccountDetails((err, results) => {
//         if (err) {
//             console.error('Error fetching data:', err.message);
//             return res.status(500).json({ message: 'Failed to fetch data', error: err.message });
//         }
//         res.status(200).json(results);
//     });
// };

// // Controller to fetch account details by ID
// const getAccountDetailsById = (req, res) => {
//     const { id } = req.params;

//     accountDetailsModel.getAccountDetailsById(id, (err, result) => {
//         if (err) {
//             console.error('Error fetching data:', err.message);
//             return res.status(500).json({ message: 'Failed to fetch data', error: err.message });
//         }
//         if (result.length === 0) {
//             return res.status(404).json({ message: 'Record not found' });
//         }
//         res.status(200).json(result[0]);
//     });
// };

// // Controller to update an account detail
// const updateAccountDetails = (req, res) => {
//     const { id } = req.params;
//     const data = req.body;

//     accountDetailsModel.updateAccountDetails(id, data, (err, result) => {
//         if (err) {
//             console.error('Error updating data:', err.message);
//             return res.status(500).json({ message: 'Failed to update data', error: err.message });
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: 'Record not found' });
//         }
//         res.status(200).json({ message: 'Record updated successfully' });
//     });
// };

// // Controller to delete an account detail
// const deleteAccountDetails = (req, res) => {
//     const { id } = req.params;

//     accountDetailsModel.deleteAccountDetails(id, (err, result) => {
//         if (err) {
//             console.error('Error deleting data:', err.message);
//             return res.status(500).json({ message: 'Failed to delete data', error: err.message });
//         }
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ message: 'Record not found' });
//         }
//         res.status(200).json({ message: 'Record deleted successfully' });
//     });
// };

// module.exports = {
//     addAccountDetails,
//     getAllAccountDetails,
//     getAccountDetailsById,
//     updateAccountDetails,
//     deleteAccountDetails
// };


const accountDetailsModel = require('../models/Accountdetails');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'customer-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpeg, .jpg, .png and .pdf formats are allowed!'));
  }
};

// Initialize multer
exports.upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to process images
const processImages = (req) => {
  if (!req.files || req.files.length === 0) {
    return null;
  }
  
  // For multiple files
  if (Array.isArray(req.files)) {
    return req.files.map(file => file.filename);
  }
  
  // For single file
  return req.files[0].filename;
};

// Controller to insert data into account_details table
const addAccountDetails = (req, res) => {
  const data = req.body;
  const images = processImages(req);

  // Add images to data if they exist
  if (images) {
    data.images = Array.isArray(images) ? images.join(',') : images;
  }

  accountDetailsModel.insertAccountDetails(data, (err, result) => {
    if (err) {
      // Clean up uploaded files if DB operation fails
      if (images) {
        const uploadDir = path.join(__dirname, '../uploads/');
        if (Array.isArray(images)) {
          images.forEach(img => fs.unlinkSync(path.join(uploadDir, img)));
        } else {
          fs.unlinkSync(path.join(uploadDir, images));
        }
      }
      
      console.error('Error inserting data:', err.message);
      return res.status(500).json({ message: 'Failed to insert data', error: err.message });
    }
    res.status(200).json({ 
      message: 'Data inserted successfully', 
      id: result.insertId,
      images: data.images 
    });
  });
};

// Controller to fetch all account details
const getAllAccountDetails = (req, res) => {
  accountDetailsModel.getAllAccountDetails((err, results) => {
    if (err) {
      console.error('Error fetching data:', err.message);
      return res.status(500).json({ message: 'Failed to fetch data', error: err.message });
    }
    
    // Process results to include full image URLs
    const processedResults = results.map(item => {
      if (item.images) {
        const imageArray = item.images.split(',');
        item.images = imageArray.map(img => ({
          filename: img,
          url: `${req.protocol}://${req.get('host')}/uploads/${img}`
        }));
      }
      return item;
    });
    
    res.status(200).json(processedResults);
  });
};

// Controller to fetch account details by ID
const getAccountDetailsById = (req, res) => {
  const { id } = req.params;

  accountDetailsModel.getAccountDetailsById(id, (err, result) => {
    if (err) {
      console.error('Error fetching data:', err.message);
      return res.status(500).json({ message: 'Failed to fetch data', error: err.message });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    // Process images
    const item = result[0];
    if (item.images) {
      const imageArray = item.images.split(',');
      item.images = imageArray.map(img => ({
        filename: img,
        url: `${req.protocol}://${req.get('host')}/uploads/${img}`
      }));
    }
    
    res.status(200).json(item);
  });
};

// Controller to update an account detail
// Update the updateAccountDetails function
const updateAccountDetails = (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const newImages = req.files ? req.files.map(file => file.filename) : [];

  // First get existing record
  accountDetailsModel.getAccountDetailsById(id, (err, existingRecord) => {
    if (err) {
      console.error('Error fetching existing record:', err.message);
      return res.status(500).json({ message: 'Failed to fetch existing data', error: err.message });
    }
    
    if (existingRecord.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    const existingImages = existingRecord[0].images ? existingRecord[0].images.split(',') : [];
    let imagesToKeep = existingImages;
    
    // Handle image deletions if client sent imagesToKeep
    if (req.body.imagesToKeep) {
      try {
        const keepList = JSON.parse(req.body.imagesToKeep);
        imagesToKeep = existingImages.filter(img => keepList.includes(img));
      } catch (e) {
        console.error('Error parsing imagesToKeep:', e);
        // If parsing fails, keep all existing images
      }
    }
    
    // Add new images to the keep list
    imagesToKeep = [...imagesToKeep, ...newImages];
    
    // Update data with combined images
    data.images = imagesToKeep.join(',');
    
    // Perform the update
    accountDetailsModel.updateAccountDetails(id, data, (err, result) => {
      if (err) {
        // Clean up newly uploaded files if DB operation fails
        if (newImages.length > 0) {
          const uploadDir = path.join(__dirname, '../uploads/');
          newImages.forEach(img => {
            try {
              fs.unlinkSync(path.join(uploadDir, img));
            } catch (e) {
              console.error('Error cleaning up new image:', img, e);
            }
          });
        }
        
        console.error('Error updating data:', err.message);
        return res.status(500).json({ message: 'Failed to update data', error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Record not found' });
      }
      
      // Delete images that were removed
      const imagesToDelete = existingImages.filter(img => !imagesToKeep.includes(img));
      if (imagesToDelete.length > 0) {
        const uploadDir = path.join(__dirname, '../uploads/');
        imagesToDelete.forEach(img => {
          try {
            fs.unlinkSync(path.join(uploadDir, img));
          } catch (e) {
            console.error('Error deleting image:', img, e);
          }
        });
      }
      
      res.status(200).json({ 
        message: 'Record updated successfully',
        images: data.images
      });
    });
  });
};

// Controller to delete an account detail
const deleteAccountDetails = (req, res) => {
  const { id } = req.params;

  // First get the record to delete associated images
  accountDetailsModel.getAccountDetailsById(id, (err, result) => {
    if (err) {
      console.error('Error fetching data to delete:', err.message);
      return res.status(500).json({ message: 'Failed to fetch data for deletion', error: err.message });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    const imagesToDelete = result[0].images ? result[0].images.split(',') : [];
    
    // Delete the record
    accountDetailsModel.deleteAccountDetails(id, (err, result) => {
      if (err) {
        console.error('Error deleting data:', err.message);
        return res.status(500).json({ message: 'Failed to delete data', error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Record not found' });
      }
      
      // Delete associated images
      if (imagesToDelete.length > 0) {
        const uploadDir = path.join(__dirname, '../uploads/');
        imagesToDelete.forEach(img => {
          try {
            fs.unlinkSync(path.join(uploadDir, img));
          } catch (e) {
            console.error('Error deleting image:', img, e);
          }
        });
      }
      
      res.status(200).json({ message: 'Record deleted successfully' });
    });
  });
};

module.exports = {
  addAccountDetails,
  getAllAccountDetails,
  getAccountDetailsById,
  updateAccountDetails,
  deleteAccountDetails,
  upload: exports.upload
};