const express = require('express');
const { User, AuditLog, PlayerProfile, InviteCode } = require('../models');
const { authMiddleware, requireCoach } = require('../middleware/authMiddleware');
const { sendParentApprovalEmail, sendParentRejectionEmail } = require('../services/emailService');

const router = express.Router();

// Generate unique invite code
const generateInviteCode = () => {
    const prefix = 'FSCA-';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + code;
};

// @route   POST /api/coach/players
// @desc    Create new player (Coach access)
// @access  Coach only
router.post('/players', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { name, email, password, phone, dob, battingStyle, bowlingStyle, playerRole, generateInviteCode: shouldGenerateCode } = req.body;

        // Validate input
        if (!name || !email || !password || !dob) {
            return res.status(400).json({ message: 'Please provide name, email, password, and date of birth' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Create player user
        const player = await User.create({
            name,
            email,
            password,
            phone,
            role: 'player',
            accountStatus: 'active'
        });

        // Create player profile with the DOB from request
        await PlayerProfile.create({
            playerUserID: player.id,
            dob: dob,
            battingStyle: battingStyle || null,
            bowlingStyle: bowlingStyle || null,
            playerRole: playerRole || null,
            photoURL: null
        });

        // Generate invite code if requested
        let inviteCode = null;
        if (shouldGenerateCode) {
            const code = generateInviteCode();
            const createdCode = await InviteCode.create({
                codeValue: code,
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                isUsed: false,
                playerUserID: player.id
            });
            inviteCode = code;
        }

        // Log in audit log
        console.log('Creating audit log entry for player (by coach):', {
            userID: req.user.id,
            action: 'PLAYER_CREATED_BY_COACH',
            entityID: player.id
        });

        const auditEntry = await AuditLog.create({
            userID: req.user.id,
            action: 'PLAYER_CREATED_BY_COACH',
            entity: 'User',
            entityID: player.id,
            timestamp: new Date()
        });

        console.log('Audit log created successfully:', auditEntry.auditLogID);

        res.status(201).json({
            message: 'Player created successfully',
            player: {
                id: player.id,
                name: player.name,
                email: player.email,
                phone: player.phone,
                role: player.role,
                dob: dob
            },
            inviteCode: inviteCode
        });
    } catch (error) {
        console.error('Create player error:', error);
        res.status(500).json({ message: 'Server error while creating player' });
    }
});

// @route   GET /api/coach/players
// @desc    Get all players
// @access  Coach only
router.get('/players', authMiddleware, requireCoach, async (req, res) => {
    try {
        const players = await User.findAll({
            where: { role: 'player' },
            attributes: { exclude: ['password'] },
            include: [{
                model: PlayerProfile,
                as: 'playerProfile',
                required: false
            }],
            order: [['id', 'DESC']]
        });

        // Format players data
        const formattedPlayers = players.map(player => {
            const profile = player.playerProfile;
            const age = profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 0;

            return {
                id: player.id.toString(),
                name: player.name,
                age: age,
                role: profile?.playerRole || 'Player',
                photo: profile?.photoURL || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200',
                stats: {
                    matches: 0,
                    runs: 0,
                    wickets: 0,
                    average: 0,
                    strikeRate: 0,
                    economy: 0
                },
                inviteCode: 'FSCA-XXXX',
                parentId: null
            };
        });

        res.json({ players: formattedPlayers });
    } catch (error) {
        console.error('Get players error:', error);
        res.status(500).json({ message: 'Server error while fetching players' });
    }
});

// @route   GET /api/coach/pending-parents
// @desc    Get all pending parent registrations
// @access  Coach only
router.get('/pending-parents', authMiddleware, requireCoach, async (req, res) => {
    try {
        const pendingParents = await User.findAll({
            where: {
                role: 'parent',
                accountStatus: 'pending'
            },
            attributes: { exclude: ['password'] }
        });

        // Format the response with a valid date (since User model doesn't have timestamps)
        const formattedParents = pendingParents.map(parent => ({
            id: parent.id,
            name: parent.name,
            email: parent.email,
            phone: parent.phone,
            createdAt: new Date().toISOString() // Use current date as fallback
        }));

        console.log(`Fetched ${pendingParents.length} pending parents`);
        res.json({ pendingParents: formattedParents });
    } catch (error) {
        console.error('Get pending parents error:', error);
        res.status(500).json({ message: 'Server error while fetching pending parents' });
    }
});

// @route   POST /api/coach/approve-parent/:id
// @desc    Approve a pending parent registration
// @access  Coach only
router.post('/approve-parent/:id', authMiddleware, requireCoach, async (req, res) => {
    try {
        const parentId = req.params.id;

        // Find the parent
        const parent = await User.findByPk(parentId);
        if (!parent) {
            return res.status(404).json({ message: 'Parent not found' });
        }

        if (parent.role !== 'parent') {
            return res.status(400).json({ message: 'User is not a parent' });
        }

        if (parent.accountStatus === 'active') {
            return res.status(400).json({ message: 'Parent is already approved' });
        }

        // Update status to active
        await parent.update({ accountStatus: 'active' });

        // Send approval email to parent
        try {
            await sendParentApprovalEmail(parent.email, parent.name);
            console.log('Approval email sent to:', parent.email);
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
        }

        // Log approval in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'PARENT_APPROVED_BY_COACH',
            entity: 'User',
            entityID: parent.id,
            timestamp: new Date()
        });

        console.log(`Parent approved: ${parent.name} (${parent.email}) by coach ${req.user.name}`);

        res.json({
            message: 'Parent approved successfully',
            parent: {
                id: parent.id,
                name: parent.name,
                email: parent.email,
                accountStatus: parent.accountStatus
            }
        });
    } catch (error) {
        console.error('Approve parent error:', error);
        res.status(500).json({ message: 'Server error while approving parent' });
    }
});

// @route   POST /api/coach/reject-parent/:id
// @desc    Reject a pending parent registration
// @access  Coach only
router.post('/reject-parent/:id', authMiddleware, requireCoach, async (req, res) => {
    try {
        const parentId = req.params.id;

        // Find the parent
        const parent = await User.findByPk(parentId);
        if (!parent) {
            return res.status(404).json({ message: 'Parent not found' });
        }

        if (parent.role !== 'parent') {
            return res.status(400).json({ message: 'User is not a parent' });
        }

        // Update status to rejected
        await parent.update({ accountStatus: 'rejected' });

        // Send rejection email to parent (optional)
        try {
            await sendParentRejectionEmail(parent.email, parent.name);
            console.log('Rejection email sent to:', parent.email);
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }

        // Log rejection in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'PARENT_REJECTED_BY_COACH',
            entity: 'User',
            entityID: parent.id,
            timestamp: new Date()
        });

        console.log(`Parent rejected: ${parent.name} (${parent.email}) by coach ${req.user.name}`);

        res.json({
            message: 'Parent rejected successfully',
            parent: {
                id: parent.id,
                name: parent.name,
                email: parent.email,
                accountStatus: parent.accountStatus
            }
        });
    } catch (error) {
        console.error('Reject parent error:', error);
        res.status(500).json({ message: 'Server error while rejecting parent' });
    }
});

module.exports = router;
