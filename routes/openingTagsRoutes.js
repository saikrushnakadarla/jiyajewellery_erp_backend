const express = require('express');
const openingTagsController = require('../controllers/openingTagsController');

const router = express.Router();


router.post('/post/opening-tags-entry', openingTagsController.createOpeningTag);
router.get('/get/opening-tags-entry', openingTagsController.getOpeningTags);
router.put('/update/opening-tags-entry/:id', openingTagsController.updateOpeningTag);
router.delete('/delete/opening-tags-entry/:opentag_id', openingTagsController.deleteOpeningTag);


router.post('/post/subcategory', openingTagsController.createSubcategory);
router.get('/get/subcategories', openingTagsController.getAllSubcategories);
router.get('/get/subcategory/:id', openingTagsController.getSubcategoryById);
router.get('/last-pbarcode', openingTagsController.getLastPcode);
router.get('/getNextPCodeBarCode', openingTagsController.getNextPCodeBarCode);

module.exports = router;
