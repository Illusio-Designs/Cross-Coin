const express = require('express');
const router = express.Router();

const {
  createLookbook,
  updateLookbook,
  deleteLookbook,
  uploadLookbookImage,
  deleteLookbookImage,
  addHotspot,
  updateHotspot,
  deleteHotspot,
} = require('../controller/lookbookController.js');
const { isAuthenticated, authorize, isProductManager } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

router.post('/', isAuthenticated, isProductManager, createLookbook);
router.put('/:id', isAuthenticated, isProductManager, updateLookbook);
router.delete('/:id', isAuthenticated, isProductManager, deleteLookbook);

router.post('/:id/images', isAuthenticated, isProductManager, upload.single('image'), uploadLookbookImage);
router.delete('/images/:imageId', isAuthenticated, isProductManager, deleteLookbookImage);

router.post('/images/:imageId/hotspots', isAuthenticated, isProductManager, addHotspot);
router.put('/hotspots/:hotspotId', isAuthenticated, isProductManager, updateHotspot);
router.delete('/hotspots/:hotspotId', isAuthenticated, isProductManager, deleteHotspot);

module.exports = router;

