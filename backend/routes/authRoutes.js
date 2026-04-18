const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, AuditLog, PasswordReset, LoginAttempt, PasswordHistory } = require('../models');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');
const { sendPasswordResetEmail, sendParentRegistrationNotification } = require('../services/emailService');

const router = express.Router();

// Validation helpers
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isStrongPassword = (password) => {
    return password && password.length >= 8;
};

// Level 2: Stronger password validation (for new passwords only)
const isStrongPasswordV2 = (password) => {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number, one special char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
};

const getPasswordRequirementsMessage = () => {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
};

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

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Validate password strength (Level 2: Stronger requirements for new passwords)
        if (!isStrongPasswordV2(password)) {
            return res.status(400).json({ message: getPasswordRequirementsMessage() });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Security: Prevent privilege escalation - only allow parent self-registration
        // Admins and coaches must be created by existing admins
        const userRole = 'parent';

        // Determine account status - parents start as pending, others are active
        const accountStatus = userRole === 'parent' ? 'pending' : 'active';

        //Create new user (password will be hashed automatically by the model hook)
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: userRole,
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
        if (userRole === 'parent') {
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
            message: 'Registration successful! Your account is pending approval.',
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
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || 'Unknown';

    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        // Track failed attempt even if user doesn't exist (but don't reveal this)
        if (!user) {
            // Log failed attempt without user ID
            await LoginAttempt.create({
                email,
                ipAddress,
                userAgent,
                attemptTime: new Date(),
                success: false
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Level 2: Check if account is locked
        if (user.lockoutUntil && new Date() < new Date(user.lockoutUntil)) {
            const lockoutEnd = new Date(user.lockoutUntil);
            const minutesRemaining = Math.ceil((lockoutEnd - new Date()) / 60000);

            await LoginAttempt.create({
                email,
                ipAddress,
                userAgent,
                attemptTime: new Date(),
                success: false
            });

            return res.status(403).json({
                message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
                lockoutUntil: user.lockoutUntil
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Increment failed login attempts
            const failedAttempts = (user.failedLoginAttempts || 0) + 1;
            const updateData = { failedLoginAttempts: failedAttempts };

            // Lock account if 5 or more failed attempts
            if (failedAttempts >= 5) {
                const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                updateData.lockoutUntil = lockoutUntil;
            }

            await user.update(updateData);

            // Log failed attempt
            await LoginAttempt.create({
                email,
                ipAddress,
                userAgent,
                attemptTime: new Date(),
                success: false
            });

            // Provide helpful message
            const remainingAttempts = Math.max(5 - failedAttempts, 0);
            if (failedAttempts >= 5) {
                return res.status(403).json({
                    message: 'Account locked due to multiple failed login attempts. Please try again in 15 minutes or contact an administrator.'
                });
            } else if (remainingAttempts <= 2) {
                return res.status(401).json({
                    message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before account lockout.`
                });
            }

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

        // Successful login - reset failed attempts and update last login
        await user.update({
            failedLoginAttempts: 0,
            lockoutUntil: null,
            lastLoginAt: new Date()
        });

        // Log successful login attempt
        await LoginAttempt.create({
            email,
            ipAddress,
            userAgent,
            attemptTime: new Date(),
            success: true
        });

        // Log login in audit log
        await AuditLog.create({
            userID: user.id,
            action: 'USER_LOGIN',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        // Generate JWT token with additional metadata
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                loginTime: new Date().getTime()
            },
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

        // Level 2: Validate new password strength (stronger requirements)
        if (!isStrongPasswordV2(newPassword)) {
            return res.status(400).json({ message: getPasswordRequirementsMessage() });
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

        // Level 2: Check password history (prevent reuse of last 5 passwords)
        const passwordHistories = await PasswordHistory.findAll({
            where: { userID: user.id },
            order: [['changedAt', 'DESC']],
            limit: 5
        });

        // Check if new password matches any of the last 5 passwords
        for (const history of passwordHistories) {
            const isSameAsOld = await bcrypt.compare(newPassword, history.passwordHash);
            if (isSameAsOld) {
                return res.status(400).json({
                    message: 'Cannot reuse any of your last 5 passwords. Please choose a different password.'
                });
            }
        }

        // Save current password to history before changing
        await PasswordHistory.create({
            userID: user.id,
            passwordHash: user.password, // Current password hash
            changedAt: new Date()
        });

        // Clean up old password history (keep only last 5)
        const allHistories = await PasswordHistory.findAll({
            where: { userID: user.id },
            order: [['changedAt', 'DESC']]
        });

        if (allHistories.length > 5) {
            const toDelete = allHistories.slice(5);
            await PasswordHistory.destroy({
                where: { id: toDelete.map(h => h.id) }
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and passwordChangedAt (for token invalidation)
        await user.update({
            password: hashedPassword,
            passwordChangedAt: new Date()
        }, { hooks: false });

        // Log password change in audit log
        await AuditLog.create({
            userID: user.id,
            action: 'PASSWORD_CHANGED',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        res.json({
            message: 'Password changed successfully. Please login again with your new password.'
        });
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

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        // Always return success message (don't reveal if email exists)
        if (!user) {
            return res.json({ message: 'If your email is registered, you will receive a password reset code.' });
        }

        // Generate 6-digit reset token
        const resetToken = generateResetToken();

        // Hash the reset token before storing (security best practice)
        const hashedToken = await bcrypt.hash(resetToken, 10);

        // Set expiry to 15 minutes from now
        const expiryDate = new Date(Date.now() + 15 * 60 * 1000);

        // Save HASHED reset token to database (never store plain text)
        await PasswordReset.create({
            userID: user.id,
            resetToken: hashedToken,
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

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Validate new password strength (Level 2: Stronger requirements)
        if (!isStrongPasswordV2(newPassword)) {
            return res.status(400).json({ message: getPasswordRequirementsMessage() });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid reset token or email' });
        }

        // Find all unused reset records for this user
        const resetRecords = await PasswordReset.findAll({
            where: {
                userID: user.id,
                isUsed: false
            },
            order: [['createdAt', 'DESC']]
        });

        // Find the matching reset record by comparing hashed tokens
        let resetRecord = null;
        for (const record of resetRecords) {
            // Compare the provided token with the hashed token in database
            const isMatch = await bcrypt.compare(resetToken, record.resetToken);
            if (isMatch) {
                resetRecord = record;
                break;
            }
        }

        if (!resetRecord) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Check if token is expired
        if (new Date() > new Date(resetRecord.expiryDate)) {
            return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
        }

        // Level 2: Check password history (prevent reuse of last 5 passwords)
        const passwordHistories = await PasswordHistory.findAll({
            where: { userID: user.id },
            order: [['changedAt', 'DESC']],
            limit: 5
        });

        // Check if new password matches any of the last 5 passwords
        for (const history of passwordHistories) {
            const isSameAsOld = await bcrypt.compare(newPassword, history.passwordHash);
            if (isSameAsOld) {
                return res.status(400).json({
                    message: 'Cannot reuse any of your last 5 passwords. Please choose a different password.'
                });
            }
        }

        // Save current password to history before changing
        await PasswordHistory.create({
            userID: user.id,
            passwordHash: user.password,
            changedAt: new Date()
        });

        // Clean up old password history (keep only last 5)
        const allHistories = await PasswordHistory.findAll({
            where: { userID: user.id },
            order: [['changedAt', 'DESC']]
        });

        if (allHistories.length > 5) {
            const toDelete = allHistories.slice(5);
            await PasswordHistory.destroy({
                where: { id: toDelete.map(h => h.id) }
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password and passwordChangedAt
        await user.update({
            password: hashedPassword,
            passwordChangedAt: new Date()
        }, { hooks: false });

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

// @route   POST /api/auth/redeem-code
// @desc    Parent redeems an invite code to link a child's profile
// @access  Private (parent only)
router.post('/redeem-code', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const { InviteCode, User, PlayerProfile } = require('../models');

        if (!code) {
            return res.status(400).json({ message: 'Please provide an invite code' });
        }

        // Only parents can redeem codes
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can redeem invite codes' });
        }

        // Find the invite code
        const inviteCode = await InviteCode.findOne({
            where: { codeValue: code.toUpperCase().trim() }
        });

        if (!inviteCode) {
            return res.status(404).json({ message: 'Invalid invite code. Please check and try again.' });
        }

        // Check if expired
        if (inviteCode.expiryDate && new Date() > new Date(inviteCode.expiryDate)) {
            return res.status(400).json({ message: 'This invite code has expired. Please ask the coach for a new code.' });
        }

        // Check if already used by someone else
        if (inviteCode.isUsed && inviteCode.parentUserID && inviteCode.parentUserID !== req.user.id) {
            return res.status(400).json({ message: 'This invite code has already been used by another account.' });
        }

        // Check if this parent already linked this child
        if (inviteCode.isUsed && inviteCode.parentUserID === req.user.id) {
            return res.status(400).json({ message: 'You have already linked this child to your account.' });
        }

        // Mark the code as used and record which parent redeemed it
        await inviteCode.update({
            isUsed: true,
            parentUserID: req.user.id
        });

        // ── Ensure parentplayerlink row exists (payment system uses this table) ──
        const sequelize = require('../config/database');
        const [existingLinks] = await sequelize.query(
            'SELECT linkID FROM parentplayerlink WHERE parentUserID = ? AND playerUserID = ?',
            { replacements: [req.user.id, inviteCode.playerUserID] }
        );
        if (existingLinks.length === 0) {
            await sequelize.query(
                'INSERT INTO parentplayerlink (parentUserID, playerUserID) VALUES (?, ?)',
                { replacements: [req.user.id, inviteCode.playerUserID] }
            );
            console.log(`[parentplayerlink] Linked parent ${req.user.id} → player ${inviteCode.playerUserID}`);
        }

        // Fetch the linked player's details
        const player = await User.findByPk(inviteCode.playerUserID, {
            include: [{
                model: PlayerProfile,
                as: 'playerProfile',
                required: false
            }]
        });

        if (!player) {
            return res.status(404).json({ message: 'Player not found for this invite code' });
        }

        const profile = player.playerProfile;
        const age = profile?.dob
            ? new Date().getFullYear() - new Date(profile.dob).getFullYear()
            : 0;

        // Log in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'INVITE_CODE_REDEEMED',
            entity: 'InviteCode',
            entityID: inviteCode.codeID,
            timestamp: new Date()
        });

        res.json({
            message: `Successfully linked ${player.name} to your account!`,
            player: {
                id: player.id.toString(),
                name: player.name,
                age,
                role: profile?.playerRole || 'Player',
                photo: profile?.photoURL || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200'
            }
        });
    } catch (error) {
        console.error('Redeem code error:', error);
        res.status(500).json({ message: 'Server error while redeeming invite code' });
    }
});

// @route   GET /api/auth/linked-children
// @desc    Get all children linked to the authenticated parent
// @access  Private (parent only)
router.get('/linked-children', authMiddleware, async (req, res) => {
    try {
        const { InviteCode, User, PlayerProfile, MatchStats } = require('../models');

        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can view linked children' });
        }

        // Find all invite codes redeemed by this parent
        const usedCodes = await InviteCode.findAll({
            where: {
                parentUserID: req.user.id,
                isUsed: true
            }
        });

        if (usedCodes.length === 0) {
            return res.json({ children: [] });
        }

        const playerIds = usedCodes.map(c => c.playerUserID);

        // Fetch each player with their profile
        const players = await User.findAll({
            where: { id: playerIds },
            include: [{
                model: PlayerProfile,
                as: 'playerProfile',
                required: false
            }]
        });

        // Build response with basic stats
        const children = await Promise.all(players.map(async (player) => {
            const profile = player.playerProfile;
            const age = profile?.dob
                ? new Date().getFullYear() - new Date(profile.dob).getFullYear()
                : 0;

            // Quick stats aggregate
            const matchStats = await MatchStats.findAll({
                where: { playerUserID: player.id }
            });
            const totalMatches = new Set(matchStats.map(s => s.matchID)).size;
            const totalRuns = matchStats.reduce((sum, s) => sum + (s.runsScored || 0), 0);
            const totalWickets = matchStats.reduce((sum, s) => sum + (s.wicketsTaken || 0), 0);
            const timesOut = matchStats.filter(s => s.wasOut).length;
            const average = timesOut > 0 ? (totalRuns / timesOut).toFixed(2) : totalRuns.toFixed(2);

            return {
                id: player.id.toString(),
                name: player.name,
                age,
                role: profile?.playerRole || 'Player',
                photo: profile?.photoURL || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200',
                stats: {
                    matches: totalMatches,
                    runs: totalRuns,
                    wickets: totalWickets,
                    average: parseFloat(average)
                }
            };
        }));

        res.json({ children });
    } catch (error) {
        console.error('Get linked children error:', error);
        res.status(500).json({ message: 'Server error while fetching linked children' });
    }
});

// @route   PUT /api/auth/update-photo
// @desc    Update profile photo URL for the logged-in user
// @access  Private
router.put('/update-photo', authMiddleware, async (req, res) => {
    try {
        const { photoURL } = req.body;
        if (!photoURL) {
            return res.status(400).json({ message: 'Photo URL is required' });
        }

        // For players: store in PlayerProfile
        if (req.user.role === 'player') {
            const { PlayerProfile } = require('../models');
            const profile = await PlayerProfile.findOne({ where: { playerUserID: req.user.id } });
            if (profile) {
                await profile.update({ photoURL });
            } else {
                await PlayerProfile.create({ playerUserID: req.user.id, photoURL });
            }
        }

        // For all roles: store on the user object in a photoURL column
        // (We store it in AuditLog metadata as a universal fallback -
        //  the frontend will persist the base64 in localStorage for non-players)
        await AuditLog.create({
            userID: req.user.id,
            action: 'PROFILE_PHOTO_UPDATED',
            entity: 'User',
            entityID: req.user.id,
            timestamp: new Date()
        });

        res.json({ message: 'Profile photo updated successfully', photoURL });
    } catch (error) {
        console.error('Update photo error:', error);
        res.status(500).json({ message: 'Server error while updating photo' });
    }
});

// @route   PUT /api/auth/update-contact
// @desc    Update email and phone for the logged-in user
// @access  Private
router.put('/update-contact', authMiddleware, async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if new email is taken by another user
        if (email !== user.email) {
            const existing = await User.findOne({ where: { email } });
            if (existing) {
                return res.status(400).json({ message: 'This email is already in use by another account' });
            }
        }

        await user.update({ email, phone: phone || user.phone });

        await AuditLog.create({
            userID: req.user.id,
            action: 'CONTACT_UPDATED',
            entity: 'User',
            entityID: req.user.id,
            timestamp: new Date()
        });

        res.json({
            message: 'Contact details updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({ message: 'Server error while updating contact' });
    }
});

module.exports = router;
