// Dashboard → Attributes. Mounted at /api/admin/attributes.
const express = require('express');
const { isAuthenticated, isProductManager } = require('../middleware/authMiddleware.js');
const svc = require('../services/attributeAdminService.js');
const { logger } = require('../config/logging.js');

const router = express.Router();
router.use(isAuthenticated, isProductManager);

const run = (fn, msg) => async (req, res) => {
  try { res.json({ success: true, ...(await fn(req)) }); }
  catch (err) {
    if (!err.status) logger.error(`${msg}: ${err.message}`);
    res.status(err.status || 500).json({ success: false, message: err.status ? err.message : msg });
  }
};

// GET ?brandId= — attributes with every choice (hidden included) and how many
// of that store's products use each one.
router.get('/', run((req) => svc.overview(req.query.brandId), 'Could not load attributes'));
router.post('/', run((req) => svc.create(req.body || {}), 'Could not create the attribute'));
router.put('/order', run((req) => svc.reorder(req.body || {}), 'Could not change the order'));
router.put('/:id', run((req) => svc.update(req.params.id, req.body || {}), 'Could not save the attribute'));
router.delete('/:id', run((req) => svc.remove(req.params.id), 'Could not delete the attribute'));
router.post('/:id/values', run((req) => svc.addValues(req.params.id, req.body?.values), 'Could not add the choices'));
router.put('/:id/values/:valueId', run((req) => svc.updateValue(req.params.id, req.params.valueId, req.body || {}), 'Could not save the choice'));
router.delete('/:id/values/:valueId', run((req) => svc.removeValue(req.params.id, req.params.valueId), 'Could not delete the choice'));

module.exports = router;
