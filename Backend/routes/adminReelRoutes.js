const express = require('express');
const router = express.Router();

const {
  createReel,
  updateReel,
  deleteReel,
  assignProducts,
  removeProduct,
} = require('../controller/reelController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const { reelUpload } = require('../middleware/uploadMiddleware.js');

router.post(
  '/',
  isAuthenticated,
  authorize(['admin']),
  reelUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  createReel
);

router.put(
  '/:id',
  isAuthenticated,
  authorize(['admin']),
  reelUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  updateReel
);

router.delete('/:id', isAuthenticated, authorize(['admin']), deleteReel);
router.post('/:id/products', isAuthenticated, authorize(['admin']), assignProducts);
router.delete('/:id/products/:productId', isAuthenticated, authorize(['admin']), removeProduct);

module.exports = router;

