import express from 'express';
import {
    getAllAttributes,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    addAttributeValues,
    removeAttributeValues
} from '../controller/attributeController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all attributes
router.get('/', getAllAttributes);

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

export default router; 