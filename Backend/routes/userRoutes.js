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
const { validateBody: zValidateBody, z, schemas: zSchemas } = require('../middleware/validate.js');

const router = express.Router();

// ── Zod schemas for auth endpoints ─────────────────────────────────
// Three valid login shapes: (email + password), (username + password),
// or (phone + access_token) for MSG91 OTP flow that storefronts use.
// The login controller already branches on all three; the schema just
// needs to let them through. Using z.union over a single object with
// every field optional so each path's missing fields surface a clear
// error instead of a vague "password required".
const loginSchema = z.union([
  z.object({
    email: z.string().trim().min(1),
    password: z.string().min(1, 'Password is required').max(256),
  }),
  z.object({
    username: z.string().trim().min(1),
    password: z.string().min(1, 'Password is required').max(256),
  }),
  z.object({
    phone: z.string().trim().min(10, 'Valid 10-digit phone number is required'),
    access_token: z.string().min(1, 'OTP verification token is required'),
  }),
]);

const adminLoginSchema = z.object({
  email: zSchemas.email,
  password: z.string().min(1, 'Password is required').max(256),
});

const forgotPasswordSchema = z.object({
  email: zSchemas.email,
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is invalid'),
  newPassword: zSchemas.password,
  confirmPassword: zSchemas.password.optional(),
}).refine((v) => !v.confirmPassword || v.confirmPassword === v.newPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const checkPhoneSchema = z.object({
  phone: z.string().trim().min(10),
});

// Public
router.post('/register', validateBody(schemas.register), register);
router.post('/login', zValidateBody(loginSchema), login);
router.post('/check-phone', zValidateBody(checkPhoneSchema), async (req, res) => {
    try {
        const { phone } = req.body;
        const digits = String(phone).replace(/\D/g, '').slice(-10);
        const { User } = require('../model/userModel.js');
        const user = await User.findOne({ where: { phone: digits } });
        res.json({ exists: !!user });
    } catch { res.json({ exists: false }); }
});
router.post('/admin-login', zValidateBody(adminLoginSchema), adminLogin);
router.post('/admin/login', zValidateBody(adminLoginSchema), adminLogin);  // backward compat
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', zValidateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', zValidateBody(resetPasswordSchema), resetPassword);
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
