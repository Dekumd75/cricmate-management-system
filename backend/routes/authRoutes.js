const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, AuditLog, PasswordReset } = require('../models');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');
const { sendPasswordResetEmail, sendParentRegistrationNotification } = require('../services/emailService');

const router = express.Router();

// Generate random 6-digit code
const generateResetToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/register
// @desc    Register a new parent user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Determine account status - parents start as pending, others are active
        const accountStatus = role === 'parent' ? 'pending' : 'active';

        //Create new user (password will be hashed automatically by the model hook)
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: role || 'parent', // Default to parent if not specified
            accountStatus
        });

        // Log registration in audit log
        await AuditLog.create({
            userID: user.id,
            action: 'USER_REGISTRATION',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        // Send notification email to admin if parent registration
        if (role === 'parent') {
            try {
                await sendParentRegistrationNotification(user);
                console.log('Admin notification sent for parent registration:', user.email);
            } catch (emailError) {
                console.error('Failed to send admin notification, but registration completed:', emailError);
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data without password
        res.status(201).json({
            message: role === 'parent' ? 'Registration successful! Your account is pending approval.' : 'User registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                accountStatus: user.accountStatus
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check account status
        if (user.accountStatus === 'pending') {
            return res.status(403).json({
                message: 'Your account is still pending approval. Please wait for an administrator to approve your account.',
                status: 'pending'
            });
        }

        if (user.accountStatus !== 'active') {
            return res.status(403).json({
                message: 'Your account has been deactivated. Please contact support.',
                status: user.accountStatus
            });
        }

        // Log login in audit log
        await AuditLog.create({
            userID: user.id,
            action: 'USER_LOGIN',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data without password
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
    try {
        res.json({
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                phone: req.user.phone
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide current and new password' });
        }

        // Validate new password length
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        // Get user with password field
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password directly (bypass the hook to avoid double hashing)
        await user.update({ password: hashedPassword }, { hooks: false });

        // Log password change in audit log
        await AuditLog.create({
            userID: user.id,
            action: 'PASSWORD_CHANGED',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error while changing password' });
    }
});

// @route   PUT /api/auth/update-contact
// @desc    Update user contact details
// @access  Private
router.put('/update-contact', authMiddleware, async (req, res) => {
    try {
        const { email, phone } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Get current user
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if email is being changed and if new email already exists
        if (email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use by another user' });
            }
        }

        // Update user contact details
        await user.update({
            email,
            phone: phone || user.phone
        });

        // Log contact update in audit log
        await AuditLog.create({
            userID: user.id,
            action: 'CONTACT_DETAILS_UPDATED',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        // Return updated user data
        res.json({
            message: 'Contact details updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({ message: 'Server error while updating contact details' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({ message: 'Please provide email address' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        // Always return success message (don't reveal if email exists)
        if (!user) {
            return res.json({ message: 'If your email is registered, you will receive a password reset code.' });
        }

        // Generate 6-digit reset token
        const resetToken = generateResetToken();

        // Set expiry to 15 minutes from now
        const expiryDate = new Date(Date.now() + 15 * 60 * 1000);

        // Save reset token to database
        await PasswordReset.create({
            userID: user.id,
            resetToken,
            expiryDate,
            isUsed: false
        });

        // Send email with reset token
        try {
            await sendPasswordResetEmail(email, resetToken, user.name);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
        }

        // Log password reset request
        await AuditLog.create({
            userID: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        res.json({ message: 'If your email is registered, you will receive a password reset code.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error while processing password reset request' });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        // Validate input
        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ message: 'Please provide email, reset token, and new password' });
        }

        // Validate new password length
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid reset token or email' });
        }

        // Find valid reset token
        const resetRecord = await PasswordReset.findOne({
            where: {
                userID: user.id,
                resetToken,
                isUsed: false
            },
            order: [['createdAt', 'DESC']]
        });

        if (!resetRecord) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Check if token is expired
        if (new Date() > new Date(resetRecord.expiryDate)) {
            return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password
        await user.update({ password: hashedPassword }, { hooks: false });

        // Mark token as used
        await resetRecord.update({ isUsed: true });

        // Log password reset completion
        await AuditLog.create({
            userID: user.id,
            action: 'PASSWORD_RESET_COMPLETED',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        res.json({ message: 'Password reset successfully. You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error while resetting password' });
    }
});

module.exports = router;
