const express = require('express');
const {
    register, login, adminLogin, logout,
    forgotPassword, resetPassword, verifyEmail,
    getCurrentUser, getProfile, updateProfile, updateUser,
    updatePassword, changePassword, deleteUser,
    getAllUsers, refreshToken, upload, updateUserRole, createStaffUser
} = require('../controller/userController.js');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware.js');
const { validateBody, schemas } = require('../utils/validate.js');

const router = express.Router();

// Public
router.post('/register', validateBody(schemas.register), register);
router.post('/login', login);
router.post('/check-phone', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ exists: false });
        const digits = String(phone).replace(/\D/g, '').slice(-10);
        const { User } = require('../model/userModel.js');
        const user = await User.findOne({ where: { phone: digits } });
        res.json({ exists: !!user });
    } catch { res.json({ exists: false }); }
});
router.post('/admin-login', adminLogin);
router.post('/admin/login', adminLogin);  // backward compat
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected
router.get('/me', isAuthenticated, getCurrentUser);
router.get('/profile', isAuthenticated, getProfile);
router.put('/profile', isAuthenticated, updateProfile);
router.put('/update', isAuthenticated, upload.single('profilePic'), updateUser);
router.put('/change-password', isAuthenticated, changePassword);
router.put('/update-password', isAuthenticated, updatePassword);
router.delete('/', isAuthenticated, deleteUser);
router.delete('/delete', isAuthenticated, deleteUser);  // backward compat

// Admin
router.get('/all', isAuthenticated, isAdmin, getAllUsers);
router.post('/staff', isAuthenticated, isAdmin, createStaffUser);
router.put('/:id/role', isAuthenticated, isAdmin, updateUserRole);

module.exports = router;
