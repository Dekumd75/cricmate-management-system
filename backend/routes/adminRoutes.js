const express = require('express');
const { User, AuditLog, PlayerProfile, InviteCode } = require('../models');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

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
        const { name, email, password, phone, age, battingStyle, bowlingStyle, playerRole, generateInviteCode: shouldGenerateCode } = req.body;

        // Validate input
        if (!name || !email || !password || !age) {
            return res.status(400).json({ message: 'Please provide name, email, password, and age' });
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

        // Calculate DOB from age (approximate)
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - parseInt(age);
        const dob = `${birthYear}-01-01`;

        // Create player profile
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
        await AuditLog.create({
            userID: req.user.id,
            action: 'PLAYER_CREATED',
            entity: 'User',
            entityID: player.id,
            timestamp: new Date()
        });

        res.status(201).json({
            message: 'Player created successfully',
            player: {
                id: player.id,
                name: player.name,
                email: player.email,
                phone: player.phone,
                role: player.role,
                age: age
            },
            inviteCode: inviteCode
        });
    } catch (error) {
        console.error('Create player error:', error);
        res.status(500).json({ message: 'Server error while creating player' });
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

module.exports = router;
