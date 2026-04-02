const express = require('express');
const {
    getAllAttributes,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    addAttributeValues,
    removeAttributeValues,
    getAttributeById,
    getMegaMenu
} = require('../controller/attributeController.js');
const { isAuthenticated, authorize, isProductManager } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Get mega menu (must be before /:id to avoid conflict)
router.get('/mega-menu', getMegaMenu);

// Get all attributes
router.get('/', getAllAttributes);

// Get attribute by ID
router.get('/:id', getAttributeById);

// Product Manager routes
router.post('/', isAuthenticated, isProductManager, createAttribute);
router.put('/:id', isAuthenticated, isProductManager, updateAttribute);
router.delete('/:id', isAuthenticated, isProductManager, deleteAttribute);
router.post('/:id/values', isAuthenticated, isProductManager, addAttributeValues);
router.delete('/:id/values', isAuthenticated, isProductManager, removeAttributeValues);

module.exports = router;