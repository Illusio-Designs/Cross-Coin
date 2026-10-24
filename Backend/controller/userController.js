const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logging.js');
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

const imageHandler = new ImageHandler(path.join(require('../utils/uploadsDir.js'), 'users'));

// Turn a DB unique-constraint clash into a message a person can act on
// (Sequelize reports it as a bare "Validation error").
function uniqueConflictMessage(error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') return null;
    const fields = Object.keys(error.fields || {}).concat((error.errors || []).map((e) => e.path)).join(' ');
    if (/email/i.test(fields)) return 'Another account already uses this email.';
    if (/phone/i.test(fields)) return 'Another account already uses this phone number.';
    if (/username/i.test(fields)) return 'Another account already uses this name.';
    return 'This value is already used by another account.';
}

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

        // Email is unique per brand (each storefront has its own consumer
        // namespace), so only reject a duplicate within this brand.
        const brandId = req.brandId || (req.brand && req.brand.id) || null;
        const existingUser = await User.findOne({ where: { email, source_brand_id: brandId } });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // DPDP S9 — persist the 18+ affirmation the storefront age gate collects.
        const ageConfirmed = req.body.age_confirmed === true;

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            phone: phone ? String(phone).replace(/\D/g, '').slice(-10) : null,
            role,
            source_brand_id: brandId,
            age_confirmed: ageConfirmed,
            age_confirmed_at: ageConfirmed ? new Date() : null,
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
            // Re-assign this brand's guest orders (keep other brands' guest
            // orders isolated). Only mark the guest converted once nothing is left.
            const regOrderWhere = { guest_user_id: guestIds, user_id: null };
            if (brandId) regOrderWhere.brand_id = brandId;
            await Order.update({ user_id: user.id, guest_user_id: null }, { where: regOrderWhere });
            // Re-assign guest shipping addresses
            const { ShippingAddress } = require('../model/shippingAddressModel.js');
            await ShippingAddress.update({ user_id: user.id, guest_user_id: null }, { where: { guest_user_id: guestIds, user_id: null } });
            const regRemaining = await Order.count({ where: { guest_user_id: guestIds, user_id: null } });
            if (regRemaining === 0) {
                await GuestUser.update({ status: 'converted', convertedAt: new Date() }, { where: { id: guestIds } });
            }

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

        // Verify the MSG91 access token server-side, bound to this phone number.
        const check = await require('../utils/msg91Verify.js').verifyMsg91Token(access_token, digits, 'Login');
        const tokenValid = check.ok;

        if (!tokenValid) {
            return res.status(401).json({ message: 'OTP verification failed. Please try again.' });
        }

        // ── Resolve the consumer for THIS brand ───────────────────────────────
        // Storefront auth is phone + OTP only — there is no separate password
        // registration step. A verified OTP proves the person owns this number,
        // so we upsert the consumer here (the standard phone-OTP identity model)
        // instead of turning first-time / prepaid-guest shoppers away with a 404.
        //
        // Accounts are brand-scoped: each brand has its own consumer namespace,
        // so a customer of one storefront cannot log into another. We therefore
        // match within req.brandId first, then fall back to a legacy account with
        // no source_brand_id (created before brand stamping) and adopt it into
        // this brand.
        const { Op } = require('sequelize');
        const { ShippingAddress } = require('../model/shippingAddressModel.js');
        const brandId = req.brandId || (req.brand ? req.brand.id : null);

        // Find any existing GUEST record for this phone (real name/email + past
        // orders) via the deterministic phone hash — the phone itself is
        // encrypted with a random IV and can't be queried. This lets a phone-OTP
        // login adopt the shopper's real details instead of leaving a bare
        // "User <phone>" placeholder, and relink their guest orders below.
        const { phoneHash } = require('../utils/encryption.js');
        const pHash = phoneHash(digits);
        let guestMatch = null;
        if (pHash) {
            guestMatch = await GuestUser.findOne({
                where: { phoneHashValue: pHash },
                order: [['updated_at', 'DESC']],
            });
        }
        const guestName = guestMatch
            ? [guestMatch.firstName, guestMatch.lastName].filter(Boolean).join(' ').trim()
            : '';
        const guestEmail = guestMatch && guestMatch.email && !guestMatch.email.endsWith('@phone.crosscoin.in')
            ? guestMatch.email.toLowerCase()
            : '';

        let user = brandId
            ? await User.findOne({ where: { phone: digits, source_brand_id: brandId } })
            : await User.findOne({ where: { phone: digits } });

        if (!user && brandId) {
            // Legacy account (pre-isolation) for this phone with no brand stamp:
            // adopt it into the brand it's logging in from.
            const legacy = await User.findOne({ where: { phone: digits, source_brand_id: null } });
            if (legacy) {
                await legacy.update({ source_brand_id: brandId });
                user = legacy;
            }
        }

        if (!user) {
            // First login for this phone on this brand → create the consumer.
            // Prefer the shopper's real name/email from a matched guest record;
            // fall back to placeholders only when there's nothing to adopt.
            const desiredEmail = guestEmail || `${digits}@phone.crosscoin.in`;
            const emailTaken = await User.findOne({ where: { email: desiredEmail } });
            const email = emailTaken ? `${digits}.b${brandId || 0}@phone.crosscoin.in` : desiredEmail;
            const username = guestName || `Customer ${digits.slice(-4)}`;
            try {
                user = await User.create({
                    username,
                    email,
                    phone: digits,
                    role: 'consumer',
                    source_brand_id: brandId,
                    password: require('crypto').randomBytes(16).toString('hex'),
                });
                logger.info(`[Login] Auto-created consumer ${user.id} for ${digits} on brand ${brandId}`);
            } catch (createErr) {
                // Pre-isolation schema still has a global unique on phone/email/
                // username → creating a second per-brand account throws. Fall back
                // to the existing account for this phone so login never hard-fails,
                // and stamp its brand if missing.
                logger.warn(`[Login] Auto-create fell back to existing account: ${createErr.message}`);
                user = await User.findOne({ where: { phone: digits } });
                if (!user) throw createErr;
                if (brandId && !user.source_brand_id) await user.update({ source_brand_id: brandId });
            }
        }

        // Upgrade a legacy placeholder name/email to the guest's real details.
        if (user && guestMatch) {
            const patch = {};
            if (guestName && /^(User|Customer)\s\d/.test(user.username || '')) patch.username = guestName;
            if (guestEmail && user.email && user.email.endsWith('@phone.crosscoin.in')) {
                const taken = await User.findOne({ where: { email: guestEmail, id: { [Op.ne]: user.id } } });
                if (!taken) patch.email = guestEmail;
            }
            if (Object.keys(patch).length) {
                try { await user.update(patch); } catch (e) { logger.warn('[Login] profile enrich failed: ' + e.message); }
            }
        }

        // Relink THIS matched guest's orders/addresses by guest_user_id — covers
        // phone-only guests whose email is a placeholder (the email match below
        // can't find them). Scoped to this brand so cross-brand stays isolated.
        if (guestMatch) {
            const ow = { guest_user_id: guestMatch.id, user_id: null };
            if (brandId) ow.brand_id = brandId;
            try {
                await Order.update({ user_id: user.id, guest_user_id: null }, { where: ow });
                await ShippingAddress.update({ user_id: user.id, guest_user_id: null }, { where: { guest_user_id: guestMatch.id, user_id: null } });
                const remaining = await Order.count({ where: { guest_user_id: guestMatch.id, user_id: null } });
                if (remaining === 0) await guestMatch.update({ status: 'converted', convertedAt: new Date() });
            } catch (e) { logger.warn('[Login] guest relink by phone failed: ' + e.message); }
        }

        // Guest-to-member: re-assign this brand's guest orders by email (primary,
        // since User.phone stores plaintext but guest phone is encrypted). Skip
        // placeholder emails (auto-created phone-only accounts have no real email).
        const guestsByEmail = user.email && !user.email.endsWith('@phone.crosscoin.in')
            ? await GuestUser.findAll({ where: { email: user.email.toLowerCase(), status: 'active' } })
            : [];

        const matchedIds = guestsByEmail.map(g => g.id);

        if (matchedIds.length > 0) {
            // Only relink guest orders/addresses that belong to THIS brand so a
            // shared-email guest on another storefront stays isolated.
            const orderWhere = { guest_user_id: matchedIds, user_id: null };
            if (brandId) orderWhere.brand_id = brandId;
            await Order.update({ user_id: user.id, guest_user_id: null }, { where: orderWhere });
            await ShippingAddress.update({ user_id: user.id, guest_user_id: null }, { where: { guest_user_id: matchedIds, user_id: null } });
            // Mark the guest converted only once its orders on every brand are linked.
            const remaining = await Order.count({ where: { guest_user_id: matchedIds, user_id: null } });
            if (remaining === 0) {
                await GuestUser.update({ status: 'converted', convertedAt: new Date() }, { where: { id: matchedIds } });
            }
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
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({ message: 'Login successful', token, user: userResponse });
    } catch (error) {
        logger.error('Mobile login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
};

// Check whether a CONSUMER account exists for this phone on the CURRENT brand.
// Storefront login uses this to show "no account — please register first"
// instead of silently creating a placeholder for a shopper who has never
// signed up on this brand. Accounts are brand-scoped, so an account on another
// storefront does not count; a legacy (unstamped) account does, since login
// would adopt it into this brand.
module.exports.checkPhone = async (req, res) => {
    try {
        const digits = String(req.body?.phone || '').replace(/\D/g, '').slice(-10);
        if (digits.length !== 10) {
            return res.status(400).json({ exists: false, message: 'Invalid phone number' });
        }
        const brandId = req.brandId || (req.brand ? req.brand.id : null);
        let user = brandId
            ? await User.findOne({ where: { phone: digits, role: 'consumer', source_brand_id: brandId } })
            : await User.findOne({ where: { phone: digits, role: 'consumer' } });
        if (!user && brandId) {
            user = await User.findOne({ where: { phone: digits, role: 'consumer', source_brand_id: null } });
        }
        return res.json({ exists: !!user });
    } catch (error) {
        logger.error('checkPhone error:', error);
        return res.status(500).json({ exists: false, message: 'Failed to check phone' });
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

        // "Last signed in" on Dashboard → Staff (fire-and-forget).
        require('../services/staffActivityService.js').recordLogin(user.id);

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
        // The route schema normalises the body to { token, newPassword, confirmPassword? }.
        const resetToken = req.body.token || req.body.resetToken;
        const password = req.body.newPassword || req.body.password;
        const confirmPassword = req.body.confirmPassword || password;

        if (!resetToken || !password) {
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

        if (!user || user.deleted_at) {
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

// **Export my data (DPDP Right to Access, S11)**
// Returns the authenticated shopper's personal data as a downloadable JSON file.
module.exports.exportMyData = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const { buildExport } = require('../services/userExportService.js');
        const data = await buildExport(userId);

        const stamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="my-data-${stamp}.json"`);
        res.status(200).send(JSON.stringify(data, null, 2));
    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        logger.error('Error exporting user data (DPDP):', error);
        res.status(500).json({ success: false, message: 'Failed to export your data', error: error.message });
    }
};

// **Delete Account (DPDP erasure — consumer self-service)**
// The storefront takes explicit consent on a confirm step, then POSTs
// `confirm: true`. We run the full cross-table erasure (see
// services/userErasureService.js), which anonymises the records tax law makes
// us keep (orders / payments / returns / reviews) and hard-deletes the rest.
module.exports.deleteUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Require the explicit confirmation the account page collects, so a
        // stray call can never erase an account without consent.
        if (req.body?.confirm !== true) {
            return res.status(400).json({
                success: false,
                message: 'Account deletion must be confirmed. Please confirm on the account page.',
            });
        }

        const { eraseUser } = require('../services/userErasureService.js');
        const { summary } = await eraseUser(userId);

        res.json({
            success: true,
            message: 'Your account and personal data have been permanently deleted.',
            summary,
        });
    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        logger.error('Error deleting user (DPDP erasure):', error);
        res.status(500).json({ success: false, message: 'Failed to delete account', error: error.message });
    }
};

// **Get All Users**
module.exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, includeDeleted } = req.query;
        const cappedLimit = Math.min(parseInt(limit) || 20, 1000);
        const offset = (parseInt(page) - 1) * cappedLimit;

        // Erased (DPDP) accounts are hidden unless explicitly requested.
        const where = includeDeleted === 'true' ? {} : { deleted_at: null };

        const Brand = require('../model/brandModel.js');
        const { count, rows } = await User.findAndCountAll({
            where,
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

// Staff users only — queried server-side by staff role. The dashboard's Staff
// page previously filtered staff out of getAllUsers (the 1000 most-RECENT
// users), so once enough customers signed up the older staff accounts fell off
// that list and the page showed "0 staff". Query them directly instead so the
// page is correct regardless of how many customers exist.
module.exports.getStaffUsers = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];
        const users = await User.findAll({
            where: { role: { [Op.in]: STAFF_ROLES }, deleted_at: null },
            attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'refreshToken', 'refreshTokenExpiry'] },
            order: [['createdAt', 'DESC']],
            limit: 500,
        });
        // Last sign-in + what each person did in the last 7 days (real rows only).
        const activity = require('../services/staffActivityService.js');
        const ids = users.map((u) => u.id);
        const [logins, week] = await Promise.all([activity.lastLogins(ids), activity.weekActivity(ids)]);
        res.json({
            users: users.map((u) => ({ ...u.toJSON(), last_login_at: logins[u.id] || null, this_week: week[u.id] || [] })),
        });
    } catch (error) {
        logger.error('Get staff users error:', error);
        res.status(500).json({ message: 'Error getting staff users' });
    }
};

// Get user profile
module.exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'resetToken', 'resetTokenExpiry', 'refreshToken', 'refreshTokenExpiry'] }
        });

        if (!user || user.deleted_at) {
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

        if (sanitizedData.username !== undefined) {
            sanitizedData.username = String(sanitizedData.username).trim().slice(0, 100);
            if (!sanitizedData.username) return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
        }
        if (sanitizedData.email !== undefined) {
            sanitizedData.email = String(sanitizedData.email).trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(sanitizedData.email)) {
                return res.status(400).json({ success: false, message: 'Enter a valid email.' });
            }
            if (sanitizedData.email !== String(user.email || '').toLowerCase()) {
                const { Op } = require('sequelize');
                const clash = await User.findOne({ where: { email: sanitizedData.email, id: { [Op.ne]: user.id }, deleted_at: null, source_brand_id: user.source_brand_id ?? null } });
                if (clash) return res.status(400).json({ success: false, message: 'Another account already uses this email.' });
            }
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
            } catch (imageError) {
                // ImageKit rejected the upload (e.g. "Upload Limit Exceeded").
                // Keep the local file (served statically from /uploads) and store
                // a FULL backend URL so getOptimizedUrl uses it as-is instead of
                // rewriting it to a non-existent ImageKit path. Don't block the
                // whole profile save just because the avatar couldn't go to the CDN.
                logger.warn('ImageKit profile upload failed, using local storage:', imageError.message);
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.crosscoin.in').replace(/\/$/, '');
                sanitizedData.profileImage = `${apiBase}/uploads/users/${path.basename(req.file.path)}`;
            }
        }

        await user.update(sanitizedData);
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully', 
            data: user 
        });
    } catch (error) {
        const conflict = uniqueConflictMessage(error);
        if (conflict) return res.status(400).json({ success: false, message: conflict });
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

// Export upload if needed
module.exports.upload = upload;

// **Update User Role (admin only)**
module.exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, roles, password, username, email, phone } = req.body;

        const VALID_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager', 'consumer'];

        // Accept either a single `role` (legacy) or a `roles` array (multi-role).
        // Normalise to a deduped, validated list; the primary `role` column is
        // set to 'admin' when present (widest access), else the first role.
        let roleList = null;
        if (Array.isArray(roles)) roleList = roles;
        else if (role) roleList = [role];
        if (roleList) {
            roleList = [...new Set(roleList)].filter((r) => VALID_ROLES.includes(r));
            if (roleList.length === 0) {
                return res.status(400).json({ message: 'Invalid role' });
            }
        }

        const user = await User.findByPk(id);
        if (!user || user.deleted_at) return res.status(404).json({ message: 'User not found' });

        const updates = {};
        if (roleList) {
            const losesAdmin = isAdminUser(user) && !roleList.includes('admin');
            if (losesAdmin && String(user.id) === String(req.user.id)) {
                return res.status(400).json({ message: 'You cannot remove your own admin role.' });
            }
            if (losesAdmin && (await countActiveAdmins()) <= 1) {
                return res.status(400).json({ message: 'This is the last admin — add another admin first.' });
            }
            updates.role = roleList.includes('admin') ? 'admin' : roleList[0];
            updates.roles = roleList;
        }
        if (username !== undefined) {
            const name = String(username).trim();
            if (!name) return res.status(400).json({ message: 'Name cannot be empty' });
            updates.username = name.slice(0, 100);
        }
        if (email !== undefined) {
            const mail = String(email).trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(mail)) return res.status(400).json({ message: 'Enter a valid email' });
            const { Op } = require('sequelize');
            const clash = await User.findOne({ where: { email: mail, id: { [Op.ne]: user.id }, deleted_at: null, source_brand_id: user.source_brand_id ?? null } });
            if (clash) return res.status(400).json({ message: 'Another account already uses this email' });
            updates.email = mail;
        }
        if (phone !== undefined) {
            const digits = String(phone || '').replace(/\D/g, '').slice(-10);
            if (digits && digits.length !== 10) return res.status(400).json({ message: 'Enter a valid 10-digit phone number' });
            updates.phone = digits || null;
        }
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
        const conflict = uniqueConflictMessage(error);
        if (conflict) return res.status(400).json({ message: conflict });
        logger.error('Update user role error:', error);
        res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
};

// **Delete another user (admin only)**
// Customers go through the DPDP erasure (orders/payments are kept but
// anonymised, personal data removed) — the same path as self-service delete.
// Staff accounts are deactivated rather than erased: their id stays on the
// orders, returns and audit rows they touched. Access ends on their next
// request because authentication rejects deleted accounts.
module.exports.adminDeleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user || user.deleted_at) return res.status(404).json({ message: 'User not found' });
        if (String(user.id) === String(req.user.id)) {
            return res.status(400).json({ message: 'You cannot delete your own account here.' });
        }
        if (isAdminUser(user) && (await countActiveAdmins()) <= 1) {
            return res.status(400).json({ message: 'This is the last admin — add another admin first.' });
        }

        if (!isStaffUser(user)) {
            const { eraseUser } = require('../services/userErasureService.js');
            const { summary } = await eraseUser(user.id);
            logger.info(`Admin ${req.user.id} erased customer ${user.id}`);
            return res.json({ success: true, message: 'Customer account and personal data deleted.', summary });
        }

        await user.update({
            deleted_at: new Date(),
            password: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
        });
        logger.info(`Admin ${req.user.id} deactivated staff user ${user.id}`);
        return res.json({ success: true, message: 'Staff account deleted. Their access ends immediately.' });
    } catch (error) {
        logger.error('Admin delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
};

const STAFF_ROLE_LIST = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];
function userRoleSet(user) {
    const set = new Set([user.role, ...(Array.isArray(user.roles) ? user.roles : [])].filter(Boolean));
    return set;
}
function isAdminUser(user) { return userRoleSet(user).has('admin'); }
function isStaffUser(user) { return [...userRoleSet(user)].some((r) => STAFF_ROLE_LIST.includes(r)); }
async function countActiveAdmins() {
    // role is the primary column; additional roles live in the JSON `roles`.
    const users = await User.findAll({ where: { deleted_at: null }, attributes: ['role', 'roles'] });
    return users.filter(isAdminUser).length;
}

// **Create Staff User (admin only)**
module.exports.createStaffUser = async (req, res) => {
    try {
        const { username, email, password, role, roles } = req.body;

        const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

        // Accept a `roles` array (multi-role) or a single `role` (legacy).
        let roleList = Array.isArray(roles) ? roles : (role ? [role] : []);
        roleList = [...new Set(roleList)].filter((r) => STAFF_ROLES.includes(r));
        if (roleList.length === 0) {
            return res.status(400).json({ message: 'At least one valid staff role is required' });
        }
        const primaryRole = roleList.includes('admin') ? 'admin' : roleList[0];

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email and password are required' });
        }

        const strengthCheck = validatePasswordStrength(password);
        if (!strengthCheck.valid) return res.status(400).json({ message: strengthCheck.message });

        const existing = await User.findOne({ where: { email, deleted_at: null } });
        if (existing) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword, role: primaryRole, roles: roleList });

        const userResponse = user.toJSON();
        delete userResponse.password;
        res.status(201).json({ message: 'Staff user created successfully', user: userResponse });
    } catch (error) {
        logger.error('Create staff user error:', error);
        res.status(500).json({ message: 'Failed to create staff user', error: error.message });
    }
};


