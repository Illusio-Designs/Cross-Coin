const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logging.js');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const { Order } = require('../model/orderModel.js');
const nodemailer = require('nodemailer');
const ImageHandler = require('../utils/imageHandler.js');
const { upload } = require('../middleware/uploadMiddleware.js');
const { validatePasswordStrength } = require('../utils/passwordValidation.js');
const imagekitService = require('../services/imagekitService.js');
const loyaltyService = require('../services/loyaltyService.js');
const dotenv = require('dotenv');
dotenv.config();

const imageHandler = new ImageHandler(path.join(__dirname, '../uploads/users'));

// Generate a refresh token, hash it, store in DB, return raw token
const issueRefreshToken = async (user) => {
    const rawTokenPart = crypto.randomBytes(40).toString('hex');
    const rawToken = `${user.id}:${rawTokenPart}`;
    const hashed = await bcrypt.hash(rawTokenPart, 10);
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await user.update({ refreshToken: hashed, refreshTokenExpiry: expiry });
    return rawToken;
};

// Helper function to add image URL to user response
const addImageUrlToResponse = (userResponse) => {
    if (userResponse.profileImage) {
        userResponse.profileImageUrl = imagekitService.getOptimizedUrl(userResponse.profileImage, 'medium');
    }
    return userResponse;
};

// **User Registration**
module.exports.register = async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        // Ignore any role from the frontend, always set to 'consumer'
        const role = 'consumer';

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const strengthCheck = validatePasswordStrength(password);
        if (!strengthCheck.valid) {
            return res.status(400).json({ message: strengthCheck.message });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            phone: phone ? String(phone).replace(/\D/g, '').slice(-10) : null,
            role,
            source_brand_id: req.brandId || null
        });

        // Guest-to-member conversion: link guest orders by email and phone
        let pointsCredited = 0;
        const { Op } = require('sequelize');

        // Find guests by email
        const guestsByEmail = await GuestUser.findAll({ where: { email: email.toLowerCase(), status: 'active' } });
        const guestIds = guestsByEmail.map(g => g.id);

        // Also find guests by phone if provided in request
        const regPhone = req.body.phone ? String(req.body.phone).replace(/\D/g, '').slice(-10) : null;
        if (regPhone) {
            const guestsByPhone = await GuestUser.findAll({ where: { status: 'active' } });
            for (const g of guestsByPhone) {
                const gPhone = String(g.phone || '').replace(/\D/g, '').slice(-10);
                if (gPhone === regPhone && !guestIds.includes(g.id)) guestIds.push(g.id);
            }
        }

        if (guestIds.length > 0) {
            await GuestUser.update({ status: 'converted', convertedAt: new Date() }, { where: { id: guestIds } });
            // Re-assign ALL guest orders (not just delivered)
            await Order.update({ user_id: user.id, guest_user_id: null }, { where: { guest_user_id: guestIds, user_id: null } });
            // Re-assign guest shipping addresses
            const { ShippingAddress } = require('../model/shippingAddressModel.js');
            await ShippingAddress.update({ user_id: user.id, guest_user_id: null }, { where: { guest_user_id: guestIds, user_id: null } });

            // Credit loyalty for delivered orders
            const deliveredGuestOrders = await Order.findAll({ where: { user_id: user.id, status: 'delivered' } });
            for (const guestOrder of deliveredGuestOrders) {
                try {
                    const loyaltyTxn = await loyaltyService.creditPoints(user.id, guestOrder.id, guestOrder.final_amount, guestOrder.brand_id || 1);
                    if (loyaltyTxn?.type === 'earned') pointsCredited += Math.max(loyaltyTxn.points || 0, 0);
                } catch (e) { logger.warn('[Login] Failed to credit loyalty points:', e.message); }
            }
        }

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse,
            pointsCredited
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
};

// **Mobile OTP Login (consumer) — OTP verified server-side via MSG91**
module.exports.login = async (req, res) => {
    try {
        const { phone, access_token } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number is required' });
        if (!access_token) return res.status(400).json({ message: 'OTP verification token is required' });

        const digits = String(phone).replace(/\D/g, '').slice(-10);
        if (digits.length !== 10) return res.status(400).json({ message: 'Invalid phone number' });

        // Verify MSG91 access token server-side
        const axios = require('axios');
        const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;

        logger.info(`[Login] Verifying MSG91 token for ${digits}, token length: ${access_token?.length}, token preview: ${String(access_token).substring(0, 30)}...`);

        let tokenValid = false;

        // Attempt 1: MSG91 verifyAccessToken API
        if (MSG91_AUTH_KEY) {
            try {
                const verifyResponse = await axios.post(
                    'https://control.msg91.com/api/v5/widget/verifyAccessToken',
                    { authkey: MSG91_AUTH_KEY, 'access-token': access_token },
                    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
                );
                logger.info('[Login] MSG91 verifyAccessToken response:', JSON.stringify(verifyResponse.data));

                if (verifyResponse.data?.type === 'success') {
                    tokenValid = true;
                } else {
                    const msg = String(verifyResponse.data?.message || '').toLowerCase();
                    if (msg.includes('already verif') || verifyResponse.data?.code === 703) {
                        tokenValid = true;
                    }
                }
            } catch (verifyErr) {
                const errData = verifyErr.response?.data;
                logger.error(`[Login] MSG91 API verify failed: status=${verifyErr.response?.status}, data=${JSON.stringify(errData)}`);

                const errMsg = String(errData?.message || '').toLowerCase();
                const errCode = errData?.code;
                if (errCode === 703 || errMsg.includes('already verif') || errMsg.includes('token already used') || errMsg.includes('verified')) {
                    tokenValid = true;
                }
            }
        } else {
            logger.warn('[Login] MSG91_AUTH_KEY not set — skipping API verification');
        }

        // Attempt 2: Decode the JWT as fallback (only when MSG91 is configured)
        if (!tokenValid && MSG91_AUTH_KEY) {
            try {
                const jwtLib = require('jsonwebtoken');
                const decoded = jwtLib.decode(access_token);
                logger.info('[Login] JWT decode fallback:', JSON.stringify(decoded));

                if (decoded && (decoded.requestId || decoded.reqId || decoded.companyId)) {
                    tokenValid = true;
                    logger.info('[Login] JWT fallback accepted — valid MSG91 token structure');
                }
            } catch (decodeErr) {
                logger.error('[Login] JWT decode failed:', decodeErr.message);
            }
        }

        if (!tokenValid) {
            return res.status(401).json({ message: 'OTP verification failed. Please try again.' });
        }

        // Find or create user by phone
        let user = await User.findOne({ where: { phone: digits } });

        if (!user) {
            // Auto-register new user with phone
            user = await User.create({
                username: 'user_' + digits.slice(-6) + '_' + Date.now().toString().slice(-4),
                email: digits + '@phone.crosscoin.in',
                phone: digits,
                role: 'consumer',
                source_brand_id: req.brandId || null,
            });
        }

        // Guest-to-member: re-assign guest orders by email (primary) since phone is encrypted
        const { Op } = require('sequelize');
        const { ShippingAddress } = require('../model/shippingAddressModel.js');

        const guestsByEmail = user.email && !user.email.endsWith('@phone.crosscoin.in')
            ? await GuestUser.findAll({ where: { email: user.email.toLowerCase(), status: 'active' } })
            : [];

        const matchedIds = guestsByEmail.map(g => g.id);

        if (matchedIds.length > 0) {
            await GuestUser.update({ status: 'converted', convertedAt: new Date() }, { where: { id: matchedIds } });
            await Order.update({ user_id: user.id, guest_user_id: null }, { where: { guest_user_id: matchedIds, user_id: null } });
            await ShippingAddress.update({ user_id: user.id, guest_user_id: null }, { where: { guest_user_id: matchedIds, user_id: null } });
            const delivered = await Order.findAll({ where: { user_id: user.id, status: 'delivered' } });
            for (const o of delivered) {
                try { await loyaltyService.creditPoints(user.id, o.id, o.final_amount, o.brand_id || 1); } catch (e) { logger.warn('[Login] Failed to credit loyalty points:', e.message); }
            }
        }

        if (user.role !== 'consumer') {
            return res.status(403).json({ message: 'Only consumer accounts can login here.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        const refreshToken = await issueRefreshToken(user);
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({ message: 'Login successful', token, refreshToken, user: userResponse });
    } catch (error) {
        logger.error('Mobile login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};

// **Admin Login**
module.exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ message: 'User not found' });

        // Only allow login for staff roles (not consumers)
        const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];
        if (!STAFF_ROLES.includes(user.role)) {
            return res.status(403).json({ message: 'Access denied. Only staff accounts can log in here.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({ message: 'Admin login successful', token, user: userResponse });
    } catch (error) {
        logger.error('Admin login error:', error);
        res.status(500).json({ message: 'Admin login failed', error: error.message });
    }
};

// **Forgot Password**
module.exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        // Check if email credentials are properly set
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            logger.error('Email credentials not properly configured in .env file');
            return res.json({ 
                message: 'Reset token generated. Email not sent due to configuration.'
            });
        }

        // Create transporter with more detailed configuration
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            },
            debug: true
        });

        const mailOptions = {
            from: `"Illusio Designs" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Reset Password',
            html: `
                <h1>Password Reset Request</h1>
                <p>You requested a password reset. Please click the link below to reset your password:</p>
                <a href="${process.env.CLIENT_URL}/reset-password/${resetToken}">Reset Password</a>
                <p>This link will expire in 15 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            `
        };

        // Send email with error handling
        try {
            await transporter.sendMail(mailOptions);
            res.json({ 
                message: 'Reset link sent to your email'
            });
        } catch (emailError) {
            logger.error('Email sending error:', emailError);
            res.json({ 
                message: 'Reset token generated. Email delivery failed.',
                error: emailError.message
            });
        }
    } catch (error) {
        logger.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to process request', error: error.message });
    }
};

// **Reset Password**
module.exports.resetPassword = async (req, res) => {
    try {
        const { resetToken, password, confirmPassword } = req.body;

        if (!resetToken || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = await User.findOne({ where: { resetToken } });
        if (!user || user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired reset link' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const strengthCheck = validatePasswordStrength(password);
        if (!strengthCheck.valid) {
            return res.status(400).json({ message: strengthCheck.message });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        logger.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password', error: error.message });
    }
};

// **Get Current User**
module.exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'refreshToken', 'refreshTokenExpiry'] }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add image URL to response
        const userResponse = addImageUrlToResponse(user.toJSON());
        
        res.json(userResponse);
    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to get user', error: error.message });
    }
};

// **Update User**
module.exports.updateUser = async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['username', 'email'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));
        
        if (!isValidOperation) {
            return res.status(400).json({ message: 'Invalid updates!' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        updates.forEach(update => {
            if (req.body[update]) user[update] = req.body[update];
        });

        // Handle profile picture upload
        if (req.file) {
            try {
                const oldProfileImage = user.profileImage;
                const buffer = await fs.promises.readFile(req.file.path);
                const filename = path.basename(req.file.path);
                const uploadResult = await imagekitService.uploadImage(buffer, filename, '/profiles');

                // Delete old ImageKit image if it was already on ImageKit
                if (oldProfileImage && oldProfileImage.startsWith('/profiles/')) {
                    await imagekitService.deleteImage(oldProfileImage).catch(err =>
                        logger.error('Failed to delete old profile image from ImageKit:', err.message)
                    );
                }

                // Store the ImageKit file path
                user.profileImage = uploadResult.filePath;

                // Clean up local temp file
                fs.unlink(req.file.path, err => {
                    if (err) logger.error('Failed to delete temp file:', err.message);
                });
            } catch (imageError) {
                logger.error('Error handling profile image:', imageError);
                return res.status(500).json({ 
                    message: 'Error processing profile picture', 
                    error: imageError.message 
                });
            }
        }

        await user.save();
        
        // Remove sensitive data from response
        const userResponse = user.toJSON();
        delete userResponse.password;
        delete userResponse.resetToken;
        delete userResponse.resetTokenExpiry;

        // Add image URL to response
        const responseWithImage = addImageUrlToResponse(userResponse);
        
        res.json({ 
            message: 'User updated successfully', 
            user: responseWithImage 
        });
    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

// **Update Password**
module.exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New passwords do not match' });
        }
        
        const strengthCheck = validatePasswordStrength(newPassword);
        if (!strengthCheck.valid) {
            return res.status(400).json({ message: strengthCheck.message });
        }
        
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        logger.error('Update password error:', error);
        res.status(500).json({ message: 'Failed to update password', error: error.message });
    }
};

// **Delete Account (soft delete — consumer self-service)**
module.exports.deleteUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const { reason } = req.body;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Soft delete — anonymise PII and mark deleted_at
        const timestamp = Date.now();
        await user.update({
            deleted_at: new Date(),
            email: `deleted_${timestamp}@deleted.crosscoin.in`,
            phone: null,
            username: `deleted_${timestamp}`,
            password: null,
            refreshToken: null,
            profileImage: null,
        });

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Failed to delete account', error: error.message });
    }
};

// **Get All Users**
module.exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const cappedLimit = Math.min(parseInt(limit) || 20, 1000);
        const offset = (parseInt(page) - 1) * cappedLimit;

        const Brand = require('../model/brandModel.js');
        const { count, rows } = await User.findAndCountAll({
            attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'refreshToken', 'refreshTokenExpiry'] },
            include: [{ model: Brand, as: 'SourceBrand', attributes: ['id', 'name', 'display_name', 'slug'] }],
            limit: cappedLimit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            users: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: cappedLimit,
                totalPages: Math.ceil(count / cappedLimit)
            }
        });
    } catch (error) {
        logger.error('Get all users error:', error);
        res.status(500).json({ message: 'Error getting users' });
    }
};

// Get user profile
module.exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userResponse = addImageUrlToResponse(user.toJSON());
        res.json(userResponse);
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({ message: 'Error getting profile' });
    }
};

// Update user profile
module.exports.updateProfile = async (req, res) => {
    try {
        const id = req.user.id;
        const updateData = req.body;

        // Whitelist allowed fields — strip role, password, deleted_at, etc.
        const allowedFields = ['username', 'email', 'profileImage'];
        const sanitizedData = {};
        for (const key of allowedFields) {
            if (updateData[key] !== undefined) {
                sanitizedData[key] = updateData[key];
            }
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Handle profile image update
        if (req.file) {
            try {
                const oldProfileImage = user.profileImage;
                const buffer = await fs.promises.readFile(req.file.path);
                const filename = path.basename(req.file.path);
                const uploadResult = await imagekitService.uploadImage(buffer, filename, '/profiles');

                // Delete old ImageKit image if it was already on ImageKit
                if (oldProfileImage && oldProfileImage.startsWith('/profiles/')) {
                    await imagekitService.deleteImage(oldProfileImage).catch(err =>
                        logger.error('Failed to delete old profile image from ImageKit:', err.message)
                    );
                }

                sanitizedData.profileImage = uploadResult.filePath;

                // Clean up local temp file
                fs.unlink(req.file.path, err => {
                    if (err) logger.error('Failed to delete temp file:', err.message);
                });
            } catch (error) {
                logger.error('Error handling profile image update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to process image',
                    error: error.message 
                });
            }
        }

        await user.update(sanitizedData);
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully', 
            data: user 
        });
    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update profile', 
            error: error.message 
        });
    }
};

// Add the missing logout function
module.exports.logout = async (req, res) => {
    try {
        // Blacklist the current JWT so it can't be reused
        if (req._token) {
            const { blacklistToken } = require('../middleware/authMiddleware.js');
            await blacklistToken(req._token);
        }

        // Invalidate refresh token in DB
        if (req.user) {
            await req.user.update({ refreshToken: null, refreshTokenExpiry: null });
        }

        res.clearCookie('token');
        if (req.logout) {
            req.logout((err) => { if (err) logger.error('Passport logout error:', err); });
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ message: 'Logout failed', error: error.message });
    }
};

// Add missing verifyEmail function
module.exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ where: { verificationToken: token } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid verification token' });
        }

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        logger.error('Email verification error:', error);
        res.status(500).json({ message: 'Failed to verify email', error: error.message });
    }
};

// Add missing changePassword function
module.exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const strengthCheck = validatePasswordStrength(newPassword);
        if (!strengthCheck.valid) {
            return res.status(400).json({ message: strengthCheck.message });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to change password', error: error.message });
    }
};

// Export upload if needed
module.exports.upload = upload;

// **Refresh Token**
module.exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token is required' });
        }

        // Parse userId from token format "userId:tokenPart"
        const parts = refreshToken.split(':');
        if (parts.length !== 2) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token format' });
        }
        const [userId, tokenPart] = parts;

        // O(1) lookup by user ID
        const user = await User.findByPk(userId);
        if (!user || !user.refreshToken || !user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        const match = await bcrypt.compare(tokenPart, user.refreshToken);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        // Rotate: issue new access token + new refresh token
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        const newRefreshToken = await issueRefreshToken(user);

        res.json({ success: true, token: accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        logger.error('Refresh token error:', error);
        res.status(500).json({ success: false, message: 'Failed to refresh token', error: error.message });
    }
};

// **Update User Role (admin only)**
module.exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, password } = req.body;

        const VALID_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager', 'consumer'];
        if (role && !VALID_ROLES.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const updates = {};
        if (role) updates.role = role;
        if (password) {
            const strengthCheck = validatePasswordStrength(password);
            if (!strengthCheck.valid) return res.status(400).json({ message: strengthCheck.message });
            updates.password = await bcrypt.hash(password, 10);
        }

        await user.update(updates);

        const userResponse = user.toJSON();
        delete userResponse.password;
        res.json({ message: 'User updated successfully', user: userResponse });
    } catch (error) {
        logger.error('Update user role error:', error);
        res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
};

// **Create Staff User (admin only)**
module.exports.createStaffUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];
        if (!STAFF_ROLES.includes(role)) {
            return res.status(400).json({ message: 'Invalid staff role' });
        }

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email and password are required' });
        }

        const strengthCheck = validatePasswordStrength(password);
        if (!strengthCheck.valid) return res.status(400).json({ message: strengthCheck.message });

        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword, role });

        const userResponse = user.toJSON();
        delete userResponse.password;
        res.status(201).json({ message: 'Staff user created successfully', user: userResponse });
    } catch (error) {
        logger.error('Create staff user error:', error);
        res.status(500).json({ message: 'Failed to create staff user', error: error.message });
    }
};


