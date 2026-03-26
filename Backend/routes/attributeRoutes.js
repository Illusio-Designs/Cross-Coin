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
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Get mega menu (must be before /:id to avoid conflict)
router.get('/mega-menu', getMegaMenu);

// Get all attributes
router.get('/', getAllAttributes);

// Get attribute by ID
router.get('/:id', getAttributeById);

// Create a new attribute
router.post('/', isAuthenticated, createAttribute);

// Update an attribute
router.put('/:id', isAuthenticated, updateAttribute);

// Delete an attribute
router.delete('/:id', isAuthenticated, deleteAttribute);

// Add values to an attribute
router.post('/:id/values', isAuthenticated, addAttributeValues);

// Remove values from an attribute
router.delete('/:id/values', isAuthenticated, removeAttributeValues);

module.exports = router;