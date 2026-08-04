const express = require('express');
const router = express.Router();
const policyController = require('../controller/policyController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', policyController.getPolicies);
router.get('/name/:name', policyController.getPublicPolicyByName);
router.get('/:id', policyController.getPolicyById);

// Admin-only routes (site policies are sensitive config)
router.post('/', authenticate, isAdmin, policyController.createPolicy);
router.put('/:id', authenticate, isAdmin, policyController.updatePolicy);
router.delete('/:id', authenticate, isAdmin, policyController.deletePolicy);

module.exports = router;
