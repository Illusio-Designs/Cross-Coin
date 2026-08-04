const jwt = require('jsonwebtoken');
const { User } = require('../model/userModel.js');

// All non-consumer staff roles
const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

// A user's effective role set = primary `role` ∪ additional `roles` (JSON array).
// This is the single source of truth for every permission check below, so a
// user with multiple assigned roles is granted the union of their access.
function effectiveRoles(user) {
    if (!user) return [];
    const set = new Set();
    if (user.role) set.add(user.role);
    if (Array.isArray(user.roles)) user.roles.forEach((r) => r && set.add(r));
    return [...set];
}
// True if the user holds ANY of the allowed roles.
function hasAnyRole(user, allowed) {
    return effectiveRoles(user).some((r) => allowed.includes(r));
}
module.exports.effectiveRoles = effectiveRoles;
module.exports.hasAnyRole = hasAnyRole;
module.exports.STAFF_ROLES = STAFF_ROLES;

// Token blacklist check via Redis
async function isTokenBlacklisted(token) {
    try {
        const redisService = require('../services/redisService.js');
        const decoded = jwt.decode(token);
        if (!decoded?.iat) return false;
        const blacklistKey = `blacklist:${decoded.id}:${decoded.iat}`;
        const result = await redisService.get(blacklistKey);
        return result !== null;
    } catch (e) {
        return false; // Redis down — allow request
    }
}

// Blacklist a token (called on logout/soft-delete)
async function blacklistToken(token) {
    try {
        const redisService = require('../services/redisService.js');
        const decoded = jwt.decode(token);
        if (!decoded?.iat || !decoded?.exp) return;
        const blacklistKey = `blacklist:${decoded.id}:${decoded.iat}`;
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
            await redisService.set(blacklistKey, '1', 'EX', ttl);
        }
    } catch (e) { /* Redis down — non-fatal */ }
}

// Authentication middleware
module.exports.authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // Check token blacklist
        if (await isTokenBlacklisted(token)) {
            return res.status(401).json({ message: 'Token has been revoked', code: 'TOKEN_REVOKED' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user || user.deleted_at) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        req._token = token; // Store for blacklisting on logout
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        if (error.name !== 'JsonWebTokenError') {
            console.error('Authentication error:', error);
        }
        res.status(401).json({ message: 'Token is not valid', code: 'INVALID_TOKEN' });
    }
};

// For backward compatibility
module.exports.isAuthenticated = module.exports.authenticate;

// Optional auth — if a valid token is present sets req.user, otherwise
// proceeds without setting it. Used for routes that should work for both
// signed-in users and guests (cart, wishlist, etc.).
module.exports.optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return next();

        if (await isTokenBlacklisted(token)) return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (user && !user.deleted_at) {
            req.user = user;
            req._token = token;
        }
        next();
    } catch {
        // Bad/expired token → treat as guest
        next();
    }
};

// Authorization middleware — pass an array of allowed roles
module.exports.authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!hasAnyRole(req.user, roles)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};

// Admin only (full access)
module.exports.isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    if (!hasAnyRole(req.user, ['admin'])) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Any staff role (admin + all managers) — use for shared admin panel access
module.exports.isStaff = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    if (!hasAnyRole(req.user, STAFF_ROLES)) {
        return res.status(403).json({ message: 'Access denied. Staff only.' });
    }
    next();
};

// Product manager or admin
module.exports.isProductManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    if (!hasAnyRole(req.user, ['admin', 'product_manager'])) {
        return res.status(403).json({ message: 'Access denied. Product manager role required.' });
    }
    next();
};

// Order manager or admin
module.exports.isOrderManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    if (!hasAnyRole(req.user, ['admin', 'order_manager'])) {
        return res.status(403).json({ message: 'Access denied. Order manager role required.' });
    }
    next();
};

// WhatsApp manager or admin
module.exports.isWhatsappManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    if (!hasAnyRole(req.user, ['admin', 'whatsapp_manager'])) {
        return res.status(403).json({ message: 'Access denied. WhatsApp manager role required.' });
    }
    next();
};

// Export blacklistToken for use in logout/deleteUser
module.exports.blacklistToken = blacklistToken;
