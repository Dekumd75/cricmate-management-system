const express = require('express');
const { User, AuditLog, PlayerProfile, InviteCode } = require('../models');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
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

// @route   POST /api/admin/coaches
// @desc    Create new coach
// @access  Admin only
router.post('/coaches', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Create coach user
        const coach = await User.create({
            name,
            email,
            password,
            phone,
            role: 'coach',
            accountStatus: 'active'
        });

        // Log in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'COACH_CREATED',
            entity: 'User',
            entityID: coach.id,
            timestamp: new Date()
        });

        res.status(201).json({
            message: 'Coach created successfully',
            coach: {
                id: coach.id,
                name: coach.name,
                email: coach.email,
                phone: coach.phone,
                role: coach.role
            }
        });
    } catch (error) {
        console.error('Create coach error:', error);
        res.status(500).json({ message: 'Server error while creating coach' });
    }
});

// @route   POST /api/admin/players
// @desc    Create new player
// @access  Admin only
router.post('/players', authMiddleware, requireAdmin, async (req, res) => {
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

        // Create player profile
        await PlayerProfile.create({
            playerUserID: player.id,
            dob: dob,
            battingStyle: battingStyle || null,
            bowlingStyle: bowlingStyle || null,
            playerRole: playerRole || null,
            photoURL: null
        });

        // Calculate age for response
        const calculatedAge = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 0;

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
        console.log('Creating audit log entry for player:', {
            userID: req.user.id,
            action: 'PLAYER_CREATED',
            entityID: player.id
        });

        const auditEntry = await AuditLog.create({
            userID: req.user.id,
            action: 'PLAYER_CREATED',
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
                age: calculatedAge,
                dob: dob
            },
            inviteCode: inviteCode
        });
    } catch (error) {
        console.error('Create player error:', error);
        res.status(500).json({ message: 'Server error while creating player' });
    }
});

// @route   GET /api/admin/coaches
// @desc    Get all coaches
// @access  Admin only
router.get('/coaches', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const coaches = await User.findAll({
            where: { role: 'coach' },
            attributes: { exclude: ['password'] },
            order: [['id', 'ASC']]
        });

        // Format coaches data
        const formattedCoaches = coaches.map(coach => ({
            id: coach.id,
            name: coach.name,
            email: coach.email,
            phone: coach.phone,
            dateJoined: coach.createdAt || new Date().toISOString().split('T')[0]
        }));

        res.json({ coaches: formattedCoaches });
    } catch (error) {
        console.error('Get coaches error:', error);
        res.status(500).json({ message: 'Server error while fetching coaches' });
    }
});

// @route   GET /api/admin/players
// @desc    Get all players with their profiles
// @access  Admin only
router.get('/players', authMiddleware, requireAdmin, async (req, res) => {
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

// @route   GET /api/admin/users
// @desc    Get all users by role
// @access  Admin only
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { role } = req.query;

        const whereClause = role ? { role } : {};

        const users = await User.findAll({
            where: whereClause,
            attributes: { exclude: ['password'] },
            order: [['id', 'DESC']]
        });

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error while fetching users' });
    }
});

// @route   GET /api/admin/audit-logs
// @desc    Get all audit logs
// @access  Admin only
router.get('/audit-logs', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const auditLogs = await AuditLog.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'role'],
                required: false // Make the join optional (LEFT JOIN instead of INNER JOIN)
            }],
            order: [['timestamp', 'DESC']],
            limit: 100 // Limit to most recent 100 logs
        });

        console.log(`Fetched ${auditLogs.length} audit logs`);
        res.json({ auditLogs });
    } catch (error) {
        console.error('Get audit logs error:', error);
        console.error('Error details:', error.message);
        if (error.parent) {
            console.error('SQL Error:', error.parent.sql);
        }
        res.status(500).json({ message: 'Server error while fetching audit logs', error: error.message });
    }
});

// @route   GET /api/admin/pending-parents
// @desc    Get all pending parent registrations
// @access  Admin only
router.get('/pending-parents', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const pendingParents = await User.findAll({
            where: {
                role: 'parent',
                accountStatus: 'pending'
            },
            attributes: { exclude: ['password'] }
        });

        console.log(`Fetched ${pendingParents.length} pending parents`);
        res.json({ pendingParents });
    } catch (error) {
        console.error('Get pending parents error:', error);
        res.status(500).json({ message: 'Server error while fetching pending parents' });
    }
});

// @route   POST /api/admin/approve-parent/:id
// @desc    Approve a pending parent registration
// @access  Admin only
router.post('/approve-parent/:id', authMiddleware, requireAdmin, async (req, res) => {
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
            // Don't fail the approval if email fails
        }

        // Log approval in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'PARENT_APPROVED',
            entity: 'User',
            entityID: parent.id,
            timestamp: new Date()
        });

        console.log(`Parent approved: ${parent.name} (${parent.email}) by admin ${req.user.name}`);

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

// @route   POST /api/admin/reject-parent/:id
// @desc    Reject a pending parent registration
// @access  Admin only
router.post('/reject-parent/:id', authMiddleware, requireAdmin, async (req, res) => {
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
            // Don't fail the rejection if email fails
        }

        // Log rejection in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'PARENT_REJECTED',
            entity: 'User',
            entityID: parent.id,
            timestamp: new Date()
        });

        console.log(`Parent rejected: ${parent.name} (${parent.email}) by admin ${req.user.name}`);

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
