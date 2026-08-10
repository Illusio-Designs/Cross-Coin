const express = require('express');
const {
    createProduct, getAllProducts, getProduct, updateProduct, deleteProduct,
    getProductsByCategory, searchProducts,
    getPublicProductBySlug, getAllPublicProducts, getBestSellers,
    getExistingImages, uploadImages, deleteImages, regenerateProductSeo
} = require('../controller/productController.js');
const { isAuthenticated, isProductManager } = require('../middleware/authMiddleware.js');
const { productUpload } = require('../middleware/uploadMiddleware.js');
const { validateBody, validateQuery, z } = require('../middleware/validate.js');

const router = express.Router();

const multerErr = (err, req, res, next) => {
  if (err) return res.status(400).json({ success: false, message: err.message });
  next();
};

// ── Zod schemas for product routes ─────────────────────────────────
// Product CREATE/UPDATE deliberately use a LOOSE schema: the real
// payload has variations / attributes / images / SEO nested objects
// that change shape often. Locking the structure here would fight the
// admin UI. We only enforce the bare minimum — anything past `passthrough()`
// is accepted as-is and validated deeper in the controller.
const productBaseSchema = z.object({
  name: z.string().trim().min(2, 'Product name is too short').max(200),
  price: z.coerce.number().nonnegative().optional(),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).optional(),
  brand_id: z.coerce.number().int().positive().optional(),
}).passthrough();

const productUpdateSchema = productBaseSchema.partial();

const productSearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).passthrough();

// ── Public ────────────────────────────────────────────────────────────────
router.get('/catalog',              getAllPublicProducts);
router.get('/best-sellers',         getBestSellers);
router.get('/by-slug/:slug',        getPublicProductBySlug);
router.get('/search',               validateQuery(productSearchSchema), searchProducts);
router.get('/category/:categoryId', getProductsByCategory);

// ── Admin / Product Manager ───────────────────────────────────────────────
router.get('/',                     isAuthenticated, isProductManager, getAllProducts);
router.get('/existing-images',      isAuthenticated, isProductManager, getExistingImages);
router.post('/upload-images',       isAuthenticated, isProductManager, productUpload.any(), multerErr, uploadImages);
router.delete('/delete-images',     isAuthenticated, isProductManager, deleteImages);
router.post('/',                    isAuthenticated, isProductManager, productUpload.any(), multerErr, validateBody(productBaseSchema), createProduct);
router.put('/:id',                  isAuthenticated, isProductManager, productUpload.any(), multerErr, validateBody(productUpdateSchema), updateProduct);
router.delete('/:id',              isAuthenticated, isProductManager, deleteProduct);
router.post('/:id/seo/regenerate',  isAuthenticated, isProductManager, regenerateProductSeo);

// ── Public by ID (last — parameterized) ───────────────────────────────────
router.get('/:id', getProduct);

module.exports = router;
