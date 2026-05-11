// const express = require('express');
// const router = express.Router();
// const accountDetailsController = require('../controllers/accountdetails');

// // Define routes and link them to controller methods
// router.post('/account-details', accountDetailsController.addAccountDetails);
// router.get('/get/account-details', accountDetailsController.getAllAccountDetails);
// router.get('/get/account-details/:id', accountDetailsController.getAccountDetailsById);
// router.put('/edit/account-details/:id', accountDetailsController.updateAccountDetails);
// router.delete('/delete/account-details/:id', accountDetailsController.deleteAccountDetails);

// module.exports = router;


const express = require('express');
const router = express.Router();
const accountDetailsController = require('../controllers/accountdetails');

// Define routes and link them to controller methods
router.post('/account-details', 
  accountDetailsController.upload.array('images', 5), // Allow up to 5 images
  accountDetailsController.addAccountDetails
);

router.get('/get/account-details', accountDetailsController.getAllAccountDetails);
router.get('/get/account-details/:id', accountDetailsController.getAccountDetailsById);

router.put('/edit/account-details/:id', 
  accountDetailsController.upload.array('images', 5),
  accountDetailsController.updateAccountDetails
);

router.delete('/delete/account-details/:id', accountDetailsController.deleteAccountDetails);

module.exports = router;