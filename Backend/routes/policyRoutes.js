const express = require('express');
const router = express.Router();
const policyController = require('../controller/policyController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', policyController.getPolicies);
router.get('/name/:name', policyController.getPublicPolicyByName);
// Shared company legal details (GSTIN) substituted into every policy. Declared
// before '/:id' so the literal path is not captured as an id.
router.get('/company-info', policyController.getCompanyInfo);
router.put('/company-info', authenticate, isAdmin, policyController.setCompanyInfo);
router.get('/:id', policyController.getPolicyById);

// Admin-only routes (site policies are sensitive config)
router.post('/', authenticate, isAdmin, policyController.createPolicy);
router.put('/:id', authenticate, isAdmin, policyController.updatePolicy);
router.delete('/:id', authenticate, isAdmin, policyController.deletePolicy);

module.exports = router;
