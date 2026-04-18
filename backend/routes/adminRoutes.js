const express = require('express');
const { User, AuditLog, PlayerProfile, InviteCode, LoginAttempt, MatchStats, Fee, Payment, AttendanceRecord, ReportLog } = require('../models');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { sendParentApprovalEmail, sendParentRejectionEmail } = require('../services/emailService');
const { Op } = require('sequelize');

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

        // Format players data with aggregated stats
        const formattedPlayers = await Promise.all(players.map(async player => {
            const profile = player.playerProfile;
            // Accurate age calculation
        let age = 0;
        if (profile?.dob) {
            const today = new Date();
            const birth = new Date(profile.dob);
            age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        }

            // Aggregate stats from MatchStats table
            const matchStats = await MatchStats.findAll({
                where: { playerUserID: player.id },
                attributes: [
                    'matchID',
                    'runsScored',
                    'ballsFaced',
                    'wicketsTaken',
                    'oversBowled',
                    'runsConceded',
                    'wasOut'
                ]
            });

            // Calculate aggregated statistics
            const totalMatches = new Set(matchStats.map(stat => stat.matchID)).size;
            const totalRuns = matchStats.reduce((sum, stat) => sum + (stat.runsScored || 0), 0);
            const totalBallsFaced = matchStats.reduce((sum, stat) => sum + (stat.ballsFaced || 0), 0);
            const totalWickets = matchStats.reduce((sum, stat) => sum + (stat.wicketsTaken || 0), 0);
            const totalOvers = matchStats.reduce((sum, stat) => sum + parseFloat(stat.oversBowled || 0), 0);
            const totalRunsConceded = matchStats.reduce((sum, stat) => sum + (stat.runsConceded || 0), 0);
            const timesOut = matchStats.filter(stat => stat.wasOut).length;

            // Calculate batting average (runs / times out, or runs if never out)
            const battingAverage = timesOut > 0 ? (totalRuns / timesOut).toFixed(2) : totalRuns.toFixed(2);

            // Calculate strike rate ((runs / balls faced) * 100)
            const strikeRate = totalBallsFaced > 0 ? ((totalRuns / totalBallsFaced) * 100).toFixed(2) : 0;

            // Calculate economy (runs conceded / overs bowled)
            const economy = totalOvers > 0 ? (totalRunsConceded / totalOvers).toFixed(2) : 0;

            // Fetch real invite code for this player
            const realCode = await InviteCode.findOne({
                where: { playerUserID: player.id },
                order: [['codeID', 'DESC']]
            });

            return {
                id: player.id.toString(),
                name: player.name,
                age: age,
                role: profile?.playerRole || 'Player',
                photo: profile?.photoURL || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200',
                stats: {
                    matches: totalMatches,
                    runs: totalRuns,
                    wickets: totalWickets,
                    average: parseFloat(battingAverage),
                    strikeRate: parseFloat(strikeRate),
                    economy: parseFloat(economy)
                },
                inviteCode: realCode?.codeValue || 'No code generated',
                parentId: null
            };
        }));

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

        // Format the response — use registeredAt column if available, else earliest audit log
        const sequelize = require('../config/database');
        const formattedParents = await Promise.all(pendingParents.map(async parent => {
            // Try to get actual registration time from audit log
            const regLog = await AuditLog.findOne({
                where: { action: 'USER_REGISTRATION', entityID: parent.id },
                order: [['timestamp', 'ASC']]
            });
            return {
                id: parent.id,
                name: parent.name,
                email: parent.email,
                phone: parent.phone,
                createdAt: regLog ? regLog.timestamp : new Date().toISOString()
            };
        }));

        console.log(`Fetched ${pendingParents.length} pending parents`);
        res.json({ pendingParents: formattedParents });
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

// ============ Level 2 Security Routes ============

// @route   POST /api/admin/unlock-account/:id
// @desc    Manually unlock a locked user account
// @access  Admin only
router.post('/unlock-account/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Reset lockout fields
        await user.update({
            failedLoginAttempts: 0,
            lockoutUntil: null
        });

        // Log in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'ACCOUNT_UNLOCKED',
            entity: 'User',
            entityID: user.id,
            timestamp: new Date()
        });

        res.json({
            message: 'Account unlocked successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Unlock account error:', error);
        res.status(500).json({ message: 'Server error while unlocking account' });
    }
});

// @route   GET /api/admin/login-attempts/:userId
// @desc    View login attempt history for a specific user
// @access  Admin only
router.get('/login-attempts/:userId', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const attempts = await LoginAttempt.findAll({
            where: { email: user.email },
            order: [['attemptTime', 'DESC']],
            limit: 50
        });

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            attempts: attempts.map(attempt => ({
                id: attempt.id,
                ipAddress: attempt.ipAddress,
                userAgent: attempt.userAgent,
                attemptTime: attempt.attemptTime,
                success: attempt.success
            }))
        });
    } catch (error) {
        console.error('Get login attempts error:', error);
        res.status(500).json({ message: 'Server error while fetching login attempts' });
    }
});

// @route   GET /api/admin/security-logs
// @desc    View recent security events (failed logins, lockouts, etc.)
// @access  Admin only
router.get('/security-logs', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        // Get recent login attempts
        const recentAttempts = await LoginAttempt.findAll({
            order: [['attemptTime', 'DESC']],
            limit: limit
        });

        // Get locked accounts
        const lockedAccounts = await User.findAll({
            where: {
                lockoutUntil: {
                    [require('sequelize').Op.gt]: new Date()
                }
            },
            attributes: ['id', 'name', 'email', 'lockoutUntil', 'failedLoginAttempts']
        });

        // Get security-related audit logs
        const securityLogs = await AuditLog.findAll({
            where: {
                action: [
                    'PASSWORD_CHANGED',
                    'PASSWORD_RESET_REQUESTED',
                    'PASSWORD_RESET_COMPLETED',
                    'ACCOUNT_UNLOCKED'
                ]
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email'],
                required: false
            }],
            order: [['timestamp', 'DESC']],
            limit: 50
        });

        res.json({
            recentAttempts: recentAttempts.map(attempt => ({
                email: attempt.email,
                ipAddress: attempt.ipAddress,
                attemptTime: attempt.attemptTime,
                success: attempt.success
            })),
            lockedAccounts: lockedAccounts.map(account => ({
                id: account.id,
                name: account.name,
                email: account.email,
                lockoutUntil: account.lockoutUntil,
                failedAttempts: account.failedLoginAttempts
            })),
            securityLogs
        });
    } catch (error) {
        console.error('Get security logs error:', error);
        res.status(500).json({ message: 'Server error while fetching security logs' });
    }
});

// ============ Report Data Endpoints ============

// Helper: build player stats from DB
async function getPlayerStatsFromDB() {
    const players = await User.findAll({
        where: { role: 'player' },
        attributes: { exclude: ['password'] },
        include: [{ model: PlayerProfile, as: 'playerProfile', required: false }],
        order: [['id', 'ASC']]
    });

    return Promise.all(players.map(async player => {
        const profile = player.playerProfile;
        let age = 0;
        if (profile?.dob) {
            const today = new Date();
            const birth = new Date(profile.dob);
            age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        }
        const matchStats = await MatchStats.findAll({ where: { playerUserID: player.id } });
        const totalMatches = new Set(matchStats.map(s => s.matchID)).size;
        const totalRuns = matchStats.reduce((sum, s) => sum + (s.runsScored || 0), 0);
        const totalBalls = matchStats.reduce((sum, s) => sum + (s.ballsFaced || 0), 0);
        const totalWickets = matchStats.reduce((sum, s) => sum + (s.wicketsTaken || 0), 0);
        const totalOvers = matchStats.reduce((sum, s) => sum + parseFloat(s.oversBowled || 0), 0);
        const totalRunsConceded = matchStats.reduce((sum, s) => sum + (s.runsConceded || 0), 0);
        const timesOut = matchStats.filter(s => s.wasOut).length;
        const battingAvg = timesOut > 0 ? (totalRuns / timesOut).toFixed(2) : totalRuns.toFixed(2);
        const strikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : '0.00';
        const economy = totalOvers > 0 ? (totalRunsConceded / totalOvers).toFixed(2) : '0.00';
        return {
            id: player.id, name: player.name, email: player.email,
            phone: player.phone || '', age,
            role: profile?.playerRole || 'Player',
            battingStyle: profile?.battingStyle || '',
            bowlingStyle: profile?.bowlingStyle || '',
            matches: totalMatches, runs: totalRuns, wickets: totalWickets,
            battingAvg: parseFloat(battingAvg), strikeRate: parseFloat(strikeRate),
            economy: parseFloat(economy)
        };
    }));
}

// @route   GET /api/admin/reports/players
router.get('/reports/players', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const data = await getPlayerStatsFromDB();
        await ReportLog.create({ reportType: 'players', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report players error:', error);
        res.status(500).json({ message: 'Error generating players report' });
    }
});

// @route   GET /api/admin/reports/coaches
router.get('/reports/coaches', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const coaches = await User.findAll({
            where: { role: 'coach', accountStatus: 'active' },
            attributes: ['id', 'name', 'email', 'phone']
        });
        const data = coaches.map(c => ({
            coachId: c.id, name: c.name, email: c.email,
            phone: c.phone || 'N/A', status: 'Active'
        }));
        await ReportLog.create({ reportType: 'coaches', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report coaches error:', error);
        res.status(500).json({ message: 'Error generating coaches report' });
    }
});

// @route   GET /api/admin/reports/parents
router.get('/reports/parents', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { InviteCode } = require('../models');
        const parents = await User.findAll({
            where: { role: 'parent' },
            attributes: { exclude: ['password'] },
            order: [['id', 'ASC']]
        });
        const data = await Promise.all(parents.map(async parent => {
            // Find ALL players linked to this parent via redeemed invite codes
            const linkedCodes = await InviteCode.findAll({
                where: { parentUserID: parent.id, isUsed: true },
                include: [{ model: User, as: 'player', attributes: ['name'] }]
            }).catch(() => []);
            const childrenNames = linkedCodes
                .map(code => code.player?.name)
                .filter(Boolean)
                .join(', ');
            return {
                id: parent.id, name: parent.name, email: parent.email,
                phone: parent.phone || '', status: parent.accountStatus || 'N/A',
                linkedChildren: childrenNames || 'Not Linked',
                totalChildren: linkedCodes.length
            };
        }));
        await ReportLog.create({ reportType: 'parents', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report parents error:', error);
        res.status(500).json({ message: 'Error generating parents report' });
    }
});

// @route   GET /api/admin/reports/payments
// Uses real fee + payment tables
router.get('/reports/payments', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const fees = await Fee.findAll({
            include: [
                { model: User, as: 'player', attributes: ['id', 'name', 'email'] },
                { model: Payment, as: 'payments', required: false }
            ],
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];

        const data = fees.map(fee => {
            const latestPayment = fee.payments?.sort((a, b) =>
                new Date(b.paymentDate) - new Date(a.paymentDate))[0];
            return {
                feeId: fee.feeID,
                playerId: fee.playerUserID,
                playerName: fee.player?.name || 'Unknown',
                playerEmail: fee.player?.email || '',
                amount: parseFloat(fee.amountDue),
                currency: 'LKR',
                month: months[fee.month - 1] || fee.month,
                year: fee.year,
                dueDate: fee.dueDate,
                status: fee.status,
                paidOn: latestPayment?.paymentDate || null,
                paymentMethod: latestPayment?.paymentMethod || null
            };
        });
        await ReportLog.create({ reportType: 'payments', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report payments error:', error);
        res.status(500).json({ message: 'Error generating payments report' });
    }
});

// @route   GET /api/admin/reports/overdue-payments
// Uses real fee table — status === 'overdue'
router.get('/reports/overdue-payments', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const overdueFees = await Fee.findAll({
            where: { status: 'overdue' },
            include: [
                {
                    model: User, as: 'player',
                    attributes: ['id', 'name', 'email'],
                    include: [{ model: PlayerProfile, as: 'playerProfile', required: false }]
                }
            ],
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        const today = new Date();
        const data = overdueFees.map(fee => {
            const dueDate = new Date(fee.dueDate);
            const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
            const profile = fee.player?.playerProfile;
            let age = 0;
            if (profile?.dob) {
                const birth = new Date(profile.dob);
                age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            }
            return {
                feeId: fee.feeID,
                playerId: fee.playerUserID,
                playerName: fee.player?.name || 'Unknown',
                playerEmail: fee.player?.email || '',
                playerAge: age,
                amount: parseFloat(fee.amountDue),
                currency: 'LKR',
                dueDate: dueDate.toLocaleDateString('en-LK'),
                daysOverdue,
                status: 'Overdue'
            };
        });
        await ReportLog.create({ reportType: 'overdue-payments', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report overdue payments error:', error);
        res.status(500).json({ message: 'Error generating overdue payments report' });
    }
});

// @route   GET /api/admin/reports/attendance
router.get('/reports/attendance', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const players = await User.findAll({
            where: { role: 'player' },
            attributes: ['id', 'name'],
            include: [{ model: PlayerProfile, as: 'playerProfile', required: false }]
        });
        const data = await Promise.all(players.map(async player => {
            const records = await AttendanceRecord.findAll({ where: { playerUserID: player.id } });
            const total = records.length;
            const present = records.filter(r => r.status === 'present').length;
            const absent = records.filter(r => r.status === 'absent').length;
            const earlyLeave = records.filter(r => r.status === 'early-leave').length;
            const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
            const age = player.playerProfile?.dob
                ? new Date().getFullYear() - new Date(player.playerProfile.dob).getFullYear() : 0;
            return {
                playerId: player.id, playerName: player.name, age,
                role: player.playerProfile?.playerRole || 'Player',
                totalSessions: total, present, absent, earlyLeave,
                attendanceRate: rate + '%'
            };
        }));
        await ReportLog.create({ reportType: 'attendance', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report attendance error:', error);
        res.status(500).json({ message: 'Error generating attendance report' });
    }
});

// @route   GET /api/admin/reports/performance
router.get('/reports/performance', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const data = await getPlayerStatsFromDB();
        await ReportLog.create({ reportType: 'performance', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report performance error:', error);
        res.status(500).json({ message: 'Error generating performance report' });
    }
});

// @route   GET /api/admin/reports/monthly-summary
router.get('/reports/monthly-summary', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const players = await User.findAll({ where: { role: 'player' }, attributes: ['id'] });
        const coaches = await User.findAll({ where: { role: 'coach' }, attributes: ['id'] });
        const parentsList = await User.findAll({ where: { role: 'parent' }, attributes: ['id'] });
        const allAttendance = await AttendanceRecord.findAll();
        const presentCount = allAttendance.filter(r => r.status === 'present').length;
        const totalSessions = new Set(allAttendance.map(r => r.sessionID)).size;
        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        const data = [{
            reportMonth: `${months[new Date().getMonth()]} ${new Date().getFullYear()}`,
            generatedAt: new Date().toLocaleString(),
            totalPlayers: players.length,
            totalCoaches: coaches.length,
            totalParents: parentsList.length,
            totalSessions,
            totalAttendanceMarked: allAttendance.length,
            totalPresent: presentCount,
            overallAttendanceRate: allAttendance.length > 0
                ? ((presentCount / allAttendance.length) * 100).toFixed(1) + '%' : '0.0%',
            monthlyFeePerPlayer: 'LKR 3,000',
            expectedRevenue: `LKR ${(players.length * 3000).toLocaleString()}`,
        }];
        await ReportLog.create({ reportType: 'monthly-summary', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Report monthly summary error:', error);
        res.status(500).json({ message: 'Error generating monthly summary' });
    }
});

module.exports = router;
