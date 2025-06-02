import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { 
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getCurrentUser,
    getProfile,
    updateProfile,
    updateUser,
    updatePassword,
    changePassword,
    deleteUser,
    getAllUsers,
    upload
} from '../controller/userController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Google authentication routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }), 
    (req, res) => {
        try {
            const token = jwt.sign(
                { id: req.user.id, email: req.user.email, role: req.user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            const userResponse = req.user.toJSON();
            delete userResponse.password;

            res.json({
                message: 'Google authentication successful',
                token,
                user: userResponse
            });
        } catch (error) {
            console.error('Google auth callback error:', error);
            res.status(500).json({ message: 'Authentication failed', error: error.message });
        }
    }
);

// Protected routes
router.get('/me', isAuthenticated, getCurrentUser);
router.get('/profile', isAuthenticated, getProfile);
router.put('/profile', isAuthenticated, updateProfile);
router.put('/update', isAuthenticated, upload.single('profilePic'), updateUser);
router.put('/change-password', isAuthenticated, changePassword);
router.put('/update-password', isAuthenticated, updatePassword);
router.delete('/delete', isAuthenticated, deleteUser);

// Admin routes
router.get('/all', isAuthenticated, authorize(['admin']), getAllUsers);

export default router;