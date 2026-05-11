const db = require('../db');

const addCompany = (companyData, callback) => {
  const query = `
    INSERT INTO company_details (
      company_name, address, address2, city, pincode, state, state_code,
      country, email, mobile, phone, website, gst_no, pan_no, bank_name,
      bank_account_no, ifsc_code, branch, bank_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(query, [
    companyData.company_name, companyData.address, companyData.address2, companyData.city, 
    companyData.pincode, companyData.state, companyData.state_code, companyData.country, companyData.email,
    companyData.mobile, companyData.phone, companyData.website, companyData.gst_no, companyData.pan_no, 
    companyData.bank_name, companyData.bank_account_no, companyData.ifsc_code, companyData.branch, companyData.bank_url
  ], (err, result) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, result.insertId);
  });
};

const getAllCompanies = (callback) => {
  const query = "SELECT * FROM company_details";
  db.query(query, (err, results) => {
    if (err) {
      return callback(err, null);
    }
    callback(null, results);
  });
};

const getCompanyById = (id, callback) => {
  const query = "SELECT * FROM company_details WHERE id = ?";
  db.query(query, [id], callback);
};

const updateCompanyById = (companyData, id, callback) => {
  const query = `
    UPDATE company_details SET
      company_name = ?, address = ?, address2 = ?, city = ?, pincode = ?, state = ?, state_code = ?,
      country = ?, email = ?, mobile = ?, phone = ?, website = ?, gst_no = ?, pan_no = ?, bank_name = ?,
      bank_account_no = ?, ifsc_code = ?, branch = ?, bank_url = ?
    WHERE id = ?`;

  db.query(query, [
    companyData.company_name, companyData.address, companyData.address2, companyData.city, companyData.pincode, 
    companyData.state, companyData.state_code, companyData.country, companyData.email, companyData.mobile, companyData.phone, 
    companyData.website, companyData.gst_no, companyData.pan_no, companyData.bank_name, companyData.bank_account_no,
    companyData.ifsc_code, companyData.branch, companyData.bank_url, id
  ], callback);
};

const deleteCompanyById = (id, callback) => {
  const query = "DELETE FROM company_details WHERE id = ?";
  db.query(query, [id], callback);
};

module.exports = {
  addCompany,
  getAllCompanies,
  getCompanyById,
  updateCompanyById,
  deleteCompanyById
};
