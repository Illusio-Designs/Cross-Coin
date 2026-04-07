const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
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
    const rawToken = crypto.randomBytes(40).toString('hex');
    const hashed = await bcrypt.hash(rawToken, 10);
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
        const { username, email, password } = req.body;
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
            role
        });

        // Guest-to-member conversion: link guest orders by email and phone
        let pointsCredited = 0;
        const { Op } = require('sequelize');

        // Find guests by email
        const guestsByEmail = await GuestUser.findAll({ where: { email: email.toLowerCase(), status: 'active' } });
        const guestIds = guestsByEmail.map(g => g.id);

        // Also find guests by phone if provided in request
        const phone = req.body.phone ? String(req.body.phone).replace(/\D/g, '').slice(-10) : null;
        if (phone) {
            const guestsByPhone = await GuestUser.findAll({ where: { status: 'active' } });
            for (const g of guestsByPhone) {
                const gPhone = String(g.phone || '').replace(/\D/g, '').slice(-10);
                if (gPhone === phone && !guestIds.includes(g.id)) guestIds.push(g.id);
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
                } catch (_) {}
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
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
};

// **Mobile OTP Login (consumer) — OTP verified on frontend via MSG91**
module.exports.login = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number is required' });

        const digits = String(phone).replace(/\D/g, '').slice(-10);
        if (digits.length !== 10) return res.status(400).json({ message: 'Invalid phone number' });

        // Find or create user by phone
        let user = await User.findOne({ where: { phone: digits } });

        if (!user) {
            // Auto-register new user with phone
            user = await User.create({
                username: 'user_' + digits.slice(-6) + '_' + Date.now().toString().slice(-4),
                email: digits + '@phone.crosscoin.in',
                phone: digits,
                role: 'consumer',
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
                try { await loyaltyService.creditPoints(user.id, o.id, o.final_amount, o.brand_id || 1); } catch (_) {}
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
        console.error('Mobile login error:', error);
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
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Admin login failed', error: error.message });
    }
};

// **Google Authentication**
module.exports.googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});

// **Google Auth Callback**
module.exports.googleAuthCallback = (req, res) => {
    try {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email, role: req.user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );
        
        // Remove password from response
        const userResponse = req.user.toJSON();
        delete userResponse.password;
        
        res.json({ message: 'Google authentication successful', token, user: userResponse });
    } catch (error) {
        console.error('Google auth callback error:', error);
        res.status(500).json({ message: 'Authentication failed', error: error.message });
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
            console.error('Email credentials not properly configured in .env file');
            return res.json({ 
                message: 'Reset token generated. Email not sent due to configuration.',
                resetToken: resetToken
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
                message: 'Reset link sent to your email',
                resetToken: resetToken // Include token in response for testing
            });
        } catch (emailError) {
            console.error('Email sending error:', emailError);
            res.json({ 
                message: 'Reset token generated. Email delivery failed.',
                resetToken: resetToken,
                error: emailError.message
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
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
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password', error: error.message });
    }
};

// **Get Current User**
module.exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry'] }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add image URL to response
        const userResponse = addImageUrlToResponse(user.toJSON());
        
        res.json(userResponse);
    } catch (error) {
        console.error('Get user error:', error);
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
                const buffer = fs.readFileSync(req.file.path);
                const filename = path.basename(req.file.path);
                const uploadResult = await imagekitService.uploadImage(buffer, filename, '/profiles');

                // Delete old ImageKit image if it was already on ImageKit
                if (oldProfileImage && oldProfileImage.startsWith('/profiles/')) {
                    await imagekitService.deleteImage(oldProfileImage).catch(err =>
                        console.error('Failed to delete old profile image from ImageKit:', err.message)
                    );
                }

                // Store the ImageKit file path
                user.profileImage = uploadResult.filePath;

                // Clean up local temp file
                fs.unlink(req.file.path, err => {
                    if (err) console.error('Failed to delete temp file:', err.message);
                });
            } catch (imageError) {
                console.error('Error handling profile image:', imageError);
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
        console.error('Update user error:', error);
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
        console.error('Update password error:', error);
        res.status(500).json({ message: 'Failed to update password', error: error.message });
    }
};

// **Delete User**
module.exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete profile image
        if (user.profileImage && user.profileImage.startsWith('/profiles/')) {
            await imagekitService.deleteImage(user.profileImage).catch(err =>
                console.error('Failed to delete profile image from ImageKit:', err.message)
            );
        }

        await user.destroy();

        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete user', 
            error: error.message 
        });
    }
};

// **Get All Users**
module.exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
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
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Error getting profile' });
    }
};

// Update user profile
module.exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Handle profile image update
        if (req.file) {
            try {
                const oldProfileImage = user.profileImage;
                const buffer = fs.readFileSync(req.file.path);
                const filename = path.basename(req.file.path);
                const uploadResult = await imagekitService.uploadImage(buffer, filename, '/profiles');

                // Delete old ImageKit image if it was already on ImageKit
                if (oldProfileImage && oldProfileImage.startsWith('/profiles/')) {
                    await imagekitService.deleteImage(oldProfileImage).catch(err =>
                        console.error('Failed to delete old profile image from ImageKit:', err.message)
                    );
                }

                updateData.profileImage = uploadResult.filePath;

                // Clean up local temp file
                fs.unlink(req.file.path, err => {
                    if (err) console.error('Failed to delete temp file:', err.message);
                });
            } catch (error) {
                console.error('Error handling profile image update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to process image',
                    error: error.message 
                });
            }
        }

        await user.update(updateData);
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully', 
            data: user 
        });
    } catch (error) {
        console.error('Error updating profile:', error);
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
        // Invalidate refresh token in DB
        if (req.user) {
            await req.user.update({ refreshToken: null, refreshTokenExpiry: null });
        }

        res.clearCookie('token');
        if (req.logout) {
            req.logout((err) => { if (err) console.error('Passport logout error:', err); });
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
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
        console.error('Email verification error:', error);
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
        console.error('Change password error:', error);
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

        // Find users with a non-expired refresh token
        const users = await User.findAll({
            where: {
                refreshToken: { [require('sequelize').Op.not]: null },
                refreshTokenExpiry: { [require('sequelize').Op.gt]: new Date() }
            }
        });

        // Find the user whose hashed token matches
        let matchedUser = null;
        for (const u of users) {
            const match = await bcrypt.compare(refreshToken, u.refreshToken);
            if (match) { matchedUser = u; break; }
        }

        if (!matchedUser) {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        // Rotate: issue new access token + new refresh token
        const accessToken = jwt.sign(
            { id: matchedUser.id, email: matchedUser.email, role: matchedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        const newRefreshToken = await issueRefreshToken(matchedUser);

        res.json({ success: true, token: accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        console.error('Refresh token error:', error);
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
        console.error('Update user role error:', error);
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
        console.error('Create staff user error:', error);
        res.status(500).json({ message: 'Failed to create staff user', error: error.message });
    }
};

// **Guest-User Merge Report + Bulk Merge (admin only)**
module.exports.getGuestUserMergeReport = async (req, res) => {
    try {
        const { sequelize } = require('../config/db.js');

        // Find all users that have matching guest records by email
        const [matches] = await sequelize.query(`
            SELECT 
                u.id          AS user_id,
                u.username,
                u.email       AS user_email,
                u.phone       AS user_phone,
                u.createdAt   AS user_created,
                g.id          AS guest_id,
                g.email       AS guest_email,
                g.status      AS guest_status,
                g.converted_at AS convertedAt,
                COUNT(DISTINCT o_u.id)  AS user_orders,
                COUNT(DISTINCT o_g.id)  AS guest_orders,
                COUNT(DISTINCT sa_u.id) AS user_addresses,
                COUNT(DISTINCT sa_g.id) AS guest_addresses
            FROM users u
            JOIN guest_users g ON LOWER(g.email) = LOWER(u.email)
            LEFT JOIN orders o_u  ON o_u.user_id       = u.id
            LEFT JOIN orders o_g  ON o_g.guest_user_id = g.id
            LEFT JOIN shipping_addresses sa_u ON sa_u.user_id       = u.id
            LEFT JOIN shipping_addresses sa_g ON sa_g.guest_user_id = g.id
            WHERE u.role = 'consumer'
            GROUP BY u.id, g.id
            ORDER BY (COUNT(DISTINCT o_g.id) + COUNT(DISTINCT sa_g.id)) DESC, u.createdAt DESC
        `);

        // Also find orphaned orders (no user_id, no guest_user_id)
        const [orphanedOrders] = await sequelize.query(`
            SELECT id, order_number, status, final_amount, created_at
            FROM orders
            WHERE user_id IS NULL AND guest_user_id IS NULL
            ORDER BY created_at DESC
        `);

        // Orders still on guest_user_id (not yet moved to a user)
        const [pendingGuestOrders] = await sequelize.query(`
            SELECT o.id, o.order_number, o.status, o.user_id, 
                   o.guest_user_id, o.final_amount, o.created_at,
                   g.email AS guest_email, g.status AS guest_status
            FROM orders o
            JOIN guest_users g ON g.id = o.guest_user_id
            ORDER BY o.created_at DESC
        `);

        // Shipping addresses still on guest_user_id
        const [pendingGuestAddresses] = await sequelize.query(`
            SELECT sa.id, sa.user_id, sa.guest_user_id, 
                   sa.city, sa.state, sa.createdAt,
                   g.email AS guest_email
            FROM shipping_addresses sa
            JOIN guest_users g ON g.id = sa.guest_user_id
            ORDER BY sa.createdAt DESC
        `);

        res.json({
            success: true,
            summary: {
                total_matches: matches.length,
                pending_guest_orders: pendingGuestOrders.length,
                pending_guest_addresses: pendingGuestAddresses.length,
                orphaned_orders: orphanedOrders.length,
            },
            matches,
            pendingGuestOrders,
            pendingGuestAddresses,
            orphanedOrders,
        });
    } catch (error) {
        console.error('Guest merge report error:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
};

// **Bulk merge all guest data to matched users by email (admin only)**
module.exports.bulkMergeGuestUsers = async (req, res) => {
    try {
        const { sequelize } = require('../config/db.js');

        // Move orders from guest to matched user
        const [orderResult] = await sequelize.query(`
            UPDATE orders o
            JOIN guest_users g ON g.id = o.guest_user_id
            JOIN users u ON LOWER(u.email) = LOWER(g.email)
            SET o.user_id = u.id, o.guest_user_id = NULL
            WHERE o.user_id IS NULL
        `);

        // Move shipping addresses
        const [addressResult] = await sequelize.query(`
            UPDATE shipping_addresses sa
            JOIN guest_users g ON g.id = sa.guest_user_id
            JOIN users u ON LOWER(u.email) = LOWER(g.email)
            SET sa.user_id = u.id, sa.guest_user_id = NULL
            WHERE sa.user_id IS NULL
        `);

        // Mark matched guests as converted
        const [guestResult] = await sequelize.query(`
            UPDATE guest_users g
            JOIN users u ON LOWER(u.email) = LOWER(g.email)
            SET g.status = 'converted', g.converted_at = NOW()
            WHERE g.status = 'active'
        `);

        res.json({
            success: true,
            message: 'Bulk merge completed',
            orders_moved: orderResult.affectedRows || 0,
            addresses_moved: addressResult.affectedRows || 0,
            guests_converted: guestResult.affectedRows || 0,
        });
    } catch (error) {
        console.error('Bulk merge error:', error);
        res.status(500).json({ message: 'Bulk merge failed', error: error.message });
    }
};

// **Auto-create users for unmatched guests and merge their orders/addresses (admin only)**
module.exports.autoCreateUsersFromGuests = async (req, res) => {
    try {
        const { sequelize } = require('../config/db.js');
        const { Op } = require('sequelize');
        const { ShippingAddress } = require('../model/shippingAddressModel.js');
        const bcrypt = require('bcrypt');

        // Find all guest users that have orders/addresses but no matching user account
        const [unmatchedGuests] = await sequelize.query(`
            SELECT DISTINCT g.id, g.email, g.first_name, g.last_name
            FROM guest_users g
            LEFT JOIN users u ON LOWER(u.email) = LOWER(g.email)
            WHERE u.id IS NULL
              AND g.status = 'active'
              AND (
                EXISTS (SELECT 1 FROM orders o WHERE o.guest_user_id = g.id AND o.user_id IS NULL)
                OR
                EXISTS (SELECT 1 FROM shipping_addresses sa WHERE sa.guest_user_id = g.id AND sa.user_id IS NULL)
              )
        `);

        let created = 0;
        let orders_moved = 0;
        let addresses_moved = 0;
        const results = [];

        for (const guest of unmatchedGuests) {
            try {
                // Generate a random password — user can reset via OTP login
                const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
                const username = `${(guest.first_name || 'user').toLowerCase().replace(/\s+/g, '')}_${guest.id}_${Date.now().toString().slice(-4)}`;

                const newUser = await User.create({
                    username,
                    email: guest.email.toLowerCase(),
                    password: tempPassword,
                    role: 'consumer',
                });

                // Move orders
                const [orderUpdate] = await sequelize.query(`
                    UPDATE orders SET user_id = ${newUser.id}, guest_user_id = NULL
                    WHERE guest_user_id = ${guest.id} AND user_id IS NULL
                `);
                const movedOrders = orderUpdate.affectedRows || 0;

                // Move addresses
                const [addrUpdate] = await sequelize.query(`
                    UPDATE shipping_addresses SET user_id = ${newUser.id}, guest_user_id = NULL
                    WHERE guest_user_id = ${guest.id} AND user_id IS NULL
                `);
                const movedAddresses = addrUpdate.affectedRows || 0;

                // Mark guest converted
                await GuestUser.update(
                    { status: 'converted', convertedAt: new Date() },
                    { where: { id: guest.id } }
                );

                orders_moved += movedOrders;
                addresses_moved += movedAddresses;
                created++;
                results.push({
                    guest_id: guest.id,
                    email: guest.email,
                    new_user_id: newUser.id,
                    orders_moved: movedOrders,
                    addresses_moved: movedAddresses,
                });
            } catch (err) {
                results.push({ guest_id: guest.id, email: guest.email, error: err.message });
            }
        }

        res.json({
            success: true,
            message: `Auto-create completed`,
            users_created: created,
            orders_moved,
            addresses_moved,
            results,
        });
    } catch (error) {
        console.error('Auto-create users from guests error:', error);
        res.status(500).json({ message: 'Auto-create failed', error: error.message });
    }
};
