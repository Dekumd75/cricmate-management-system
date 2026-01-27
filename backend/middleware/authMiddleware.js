const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Validate JWT_SECRET at startup - fail fast if missing or insecure
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    throw new Error(
        'FATAL: JWT_SECRET is missing or using insecure default value. ' +
        'Please set a strong JWT_SECRET in your .env file.'
    );
}

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header with improved validation
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user from database
        const user = await User.findOne({ where: { id: decoded.id } });

        if (!user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        // Level 2: Check if account is currently locked
        if (user.lockoutUntil && new Date() < new Date(user.lockoutUntil)) {
            return res.status(403).json({
                message: 'Account is temporarily locked. Please try again later or contact an administrator.'
            });
        }

        // Level 2: Check if account is active
        if (user.accountStatus !== 'active' && user.accountStatus !== 'pending') {
            return res.status(403).json({
                message: 'Account has been deactivated. Please contact support.'
            });
        }

        // Level 2: Invalidate token if issued before password change
        if (user.passwordChangedAt && decoded.loginTime) {
            const passwordChangedTime = new Date(user.passwordChangedAt).getTime();
            if (decoded.loginTime < passwordChangedTime) {
                return res.status(401).json({
                    message: 'Password was changed. Please login again with your new password.'
                });
            }
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired. Please login again.' });
        }
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Coach-only middleware (also allows admin)
const requireCoach = (req, res, next) => {
    if (!req.user || (req.user.role !== 'coach' && req.user.role !== 'admin')) {
        return res.status(403).json({ message: 'Access denied. Coach only.' });
    }
    next();
};

module.exports = { authMiddleware, requireAdmin, requireCoach, JWT_SECRET };
