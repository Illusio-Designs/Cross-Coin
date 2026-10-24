// Admin "Website" area endpoints that have no natural home in an existing
// route file: the Photos library, the policies list and the SEO pages list.
// Mounted from seoAdminRoutes.js (which routesManager mounts at /api).
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { isAuthenticated, isProductManager, isAdmin } = require('../middleware/authMiddleware.js');
const website = require('../services/websiteContentService.js');
const { logger } = require('../config/logging.js');

const router = express.Router();

const UPLOAD_DIR = path.join(require('../utils/uploadsDir.js'), 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// Extension always comes from the allowlisted MIME type, never the client's
// file name (/uploads is served statically).
const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const IMAGE_TYPES = Object.keys(EXT_BY_MIME);
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `media-${Date.now()}-${Math.round(Math.random() * 1e9)}${EXT_BY_MIME[file.mimetype] || '.jpg'}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => cb(IMAGE_TYPES.includes(file.mimetype) ? null : new Error('Only JPG, PNG, WEBP or GIF photos can be uploaded'), IMAGE_TYPES.includes(file.mimetype)),
});

const fail = (res, err, fallback) => {
  logger.error(`[website admin] ${fallback}: ${err && err.message}`);
  res.status(err && err.status ? err.status : 500).json({ success: false, message: (err && err.status && err.message) || fallback });
};

// ── Photos library ───────────────────────────────────────────────────────────
// GET ?search=&usage=all|used|unused|products|slides|posts&page=&limit=
router.get('/admin/website/media', isAuthenticated, isProductManager, async (req, res) => {
  try {
    const data = await website.listMedia({
      search: req.query.search, usage: req.query.usage, page: req.query.page, limit: req.query.limit,
    });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'Could not load photos'); }
});

// POST multipart "images" (1–20 files). Stored on ImageKit (/products, the
// same folder the old gallery used); a local copy is kept if ImageKit refuses.
router.post('/admin/website/media', isAuthenticated, isProductManager, (req, res, next) => {
  upload.array('images', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 10 MB' : err.message });
    return next();
  });
}, async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ success: false, message: 'Choose at least one photo' });
  const imagekitService = require('../services/imagekitService.js');
  const uploaded = [];
  const failed = [];
  for (const file of files) {
    try {
      let stored;
      try {
        const buf = await fs.promises.readFile(file.path);
        const ik = await imagekitService.uploadImage(buf, file.originalname || file.filename, '/products');
        stored = ik.filePath;
        fs.unlink(file.path, () => {});
      } catch (e) {
        logger.warn(`[website media] ImageKit upload failed for ${file.originalname}, keeping local copy: ${e.message}`);
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.crosscoin.in').replace(/\/$/, '');
        stored = `${apiBase}/api/uploads/products/${file.filename}`;
      }
      try {
        await website.recordUpload({ filePath: stored, originalName: file.originalname, size: file.size, userId: req.user && req.user.id });
      } catch (e) {
        fs.unlink(file.path, () => {});
        throw e;
      }
      uploaded.push({ name: file.originalname, path: stored, url: website.fullUrl(stored) });
    } catch (e) {
      logger.error(`[website media] upload ${file.originalname} failed: ${e.message}`);
      failed.push({ name: file.originalname, reason: 'Could not save this photo' });
    }
  }
  res.status(uploaded.length ? 201 : 500).json({ success: uploaded.length > 0, uploaded, failed });
});

// DELETE body { keys: [file names] } — only photos used nowhere are removed.
router.delete('/admin/website/media', isAuthenticated, isProductManager, async (req, res) => {
  try {
    const keys = Array.isArray(req.body && req.body.keys) ? req.body.keys : [];
    if (!keys.length) return res.status(400).json({ success: false, message: 'Pick at least one photo' });
    const result = await website.deleteMedia(keys);
    res.json({ success: true, ...result });
  } catch (err) { fail(res, err, 'Could not delete photos'); }
});

// ── Policies ─────────────────────────────────────────────────────────────────
// GET ?brandId=<id>|global|''&search=  → last updated, shared-vs-store, and for
// the returns policy whether its text matches the real return window.
router.get('/admin/website/policies', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const data = await website.listPolicies({ brandId: req.query.brandId, search: req.query.search });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'Could not load policies'); }
});

// ── SEO pages ────────────────────────────────────────────────────────────────
// GET ?brandId=&search=&state=all|live|fix|hidden&page=&limit=
router.get('/admin/website/seo-pages', isAuthenticated, isProductManager, async (req, res) => {
  try {
    const data = await website.listSeoPages({
      brandId: req.query.brandId, search: req.query.search, state: req.query.state, page: req.query.page, limit: req.query.limit,
    });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'Could not load SEO pages'); }
});

module.exports = router;
