const express = require('express');
const router = express.Router();

const {
  createReel,
  updateReel,
  deleteReel,
  assignProducts,
  removeProduct,
} = require('../controller/reelController.js');
const { isAuthenticated, authorize, isProductManager } = require('../middleware/authMiddleware.js');
const { reelUpload } = require('../middleware/uploadMiddleware.js');

router.post(
  '/',
  isAuthenticated,
  isProductManager,
  reelUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  createReel
);

router.put(
  '/:id',
  isAuthenticated,
  isProductManager,
  reelUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  updateReel
);

router.delete('/:id', isAuthenticated, isProductManager, deleteReel);
router.post('/:id/products', isAuthenticated, isProductManager, assignProducts);
router.delete('/:id/products/:productId', isAuthenticated, isProductManager, removeProduct);

module.exports = router;

