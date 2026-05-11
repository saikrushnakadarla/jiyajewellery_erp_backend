const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyInfoController');

router.post('/post/companies', companyController.addCompany);
router.get('/get/companies', companyController.getCompanies);
router.get("/get/companies/:id", companyController.getCompany);
router.put("/edit/companies/:id", companyController.updateCompany);
router.delete("/delete/companies/:id", companyController.deleteCompany);

module.exports = router;
