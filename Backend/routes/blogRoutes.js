// routes/blogRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');
const {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory,
    createPost,
    getAllPostsAdmin,
    getPostByIdAdmin,
    updatePost,
    deletePost,
    getPublicPosts,
    getPublicPostBySlug,
    getAllTags,
    uploadHeroImage,
} = require('../controller/blogController.js');

// ─── Public routes (no auth required) ───────────────────────────────────────
router.get('/public', getPublicPosts);
router.get('/public/:slug', getPublicPostBySlug);
router.get('/tags', getAllTags);

// ─── Admin routes (auth + admin role required) ───────────────────────────────
router.use('/admin', isAuthenticated, authorize(['admin']));

// Categories
router.post('/admin/categories', createCategory);
router.get('/admin/categories', getAllCategories);
router.put('/admin/categories/:id', updateCategory);
router.delete('/admin/categories/:id', deleteCategory);

// Posts
router.post('/admin/posts', createPost);
router.get('/admin/posts', getAllPostsAdmin);
router.get('/admin/posts/:id', getPostByIdAdmin);
router.put('/admin/posts/:id', updatePost);
router.delete('/admin/posts/:id', deletePost);

// Hero image upload — uses disk storage, controller reads buffer from disk
router.post('/admin/posts/:id/hero-image', upload.single('image'), uploadHeroImage);

module.exports = router;
