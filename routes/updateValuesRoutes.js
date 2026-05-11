// routes/entryRoutes.js
const express = require('express');
const { addEntryHandler, getEntryHandler,getMaxTagId, deleteData,getBalance   } = require('../controllers/updateValuesController');

const router = express.Router();

router.post('/add-entry', addEntryHandler);
router.get('/entry/:productId/:tagId', getEntryHandler);
// router.put('/delete-updated-values/:product_id', deleteUpdatedValues);
router.get("/max-tag-id", getMaxTagId);
// router.delete("/delete/:tag_id/:product_id", deletedEntry);

router.delete("/delete/updatedvalues/:tag_id/:product_id", deleteData);

router.get("/get-balance/:product_id/:tag_id", getBalance)

module.exports = router;
