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
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

router.post('/', isAuthenticated, authorize(['admin']), createLookbook);
router.put('/:id', isAuthenticated, authorize(['admin']), updateLookbook);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteLookbook);

router.post('/:id/images', isAuthenticated, authorize(['admin']), upload.single('image'), uploadLookbookImage);
router.delete('/images/:imageId', isAuthenticated, authorize(['admin']), deleteLookbookImage);

router.post('/images/:imageId/hotspots', isAuthenticated, authorize(['admin']), addHotspot);
router.put('/hotspots/:hotspotId', isAuthenticated, authorize(['admin']), updateHotspot);
router.delete('/hotspots/:hotspotId', isAuthenticated, authorize(['admin']), deleteHotspot);

module.exports = router;

