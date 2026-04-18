const express = require('express');
const { User, AuditLog, PlayerProfile, InviteCode, MatchStats, ReportLog } = require('../models');
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

        // Format players data with aggregated stats
        const formattedPlayers = await Promise.all(players.map(async player => {
            const profile = player.playerProfile;
            const age = profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 0;

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

            // Fetch real invite code
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

        // Format the response — look up real registration date from audit log
        const formattedParents = await Promise.all(pendingParents.map(async parent => {
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

// ============ Coach Report Data Endpoints ============

// Helper: build player stats for coach reports
async function getCoachPlayerStats() {
    const players = await User.findAll({
        where: { role: 'player' },
        attributes: { exclude: ['password'] },
        include: [{ model: PlayerProfile, as: 'playerProfile', required: false }],
        order: [['id', 'ASC']]
    });
    return Promise.all(players.map(async player => {
        const profile = player.playerProfile;
        // Accurate age: account for whether birthday has passed this year
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
        // Attendance
        const { AttendanceRecord } = require('../models');
        const attRecords = await AttendanceRecord.findAll({ where: { playerUserID: player.id } });
        const attTotal = attRecords.length;
        const attPresent = attRecords.filter(r => r.status === 'present').length;
        const attRate = attTotal > 0 ? ((attPresent / attTotal) * 100).toFixed(1) : '0.0';
        return {
            id: player.id, name: player.name, email: player.email, age,
            role: profile?.playerRole || 'Player',
            battingStyle: profile?.battingStyle || 'N/A',
            bowlingStyle: profile?.bowlingStyle || 'N/A',
            matches: totalMatches, runs: totalRuns, wickets: totalWickets,
            battingAvg: parseFloat(battingAvg), strikeRate: parseFloat(strikeRate),
            economy: parseFloat(economy),
            totalSessions: attTotal, presentSessions: attPresent,
            attendanceRate: attRate + '%'
        };
    }));
}

// @route   GET /api/coach/reports/player-performance
router.get('/reports/player-performance', authMiddleware, requireCoach, async (req, res) => {
    try {
        const data = await getCoachPlayerStats();
        await ReportLog.create({ reportType: 'coach-player-performance', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Coach report player-performance error:', error);
        res.status(500).json({ message: 'Error generating player performance report' });
    }
});

// @route   GET /api/coach/reports/attendance-summary
router.get('/reports/attendance-summary', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { AttendanceRecord } = require('../models');
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
            return {
                playerId: player.id, playerName: player.name,
                role: player.playerProfile?.playerRole || 'Player',
                totalSessions: total, present, absent, earlyLeave,
                attendanceRate: rate + '%'
            };
        }));
        await ReportLog.create({ reportType: 'coach-attendance-summary', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Coach report attendance-summary error:', error);
        res.status(500).json({ message: 'Error generating attendance summary' });
    }
});

// @route   GET /api/coach/reports/team-statistics
router.get('/reports/team-statistics', authMiddleware, requireCoach, async (req, res) => {
    try {
        const allStats = await getCoachPlayerStats();
        const totalRuns = allStats.reduce((s, p) => s + p.runs, 0);
        const totalWickets = allStats.reduce((s, p) => s + p.wickets, 0);
        const totalMatches = allStats.reduce((s, p) => s + p.matches, 0);
        const avgRuns = allStats.length > 0 ? (totalRuns / allStats.length).toFixed(2) : '0.00';
        const avgWickets = allStats.length > 0 ? (totalWickets / allStats.length).toFixed(2) : '0.00';
        const topScorer = [...allStats].sort((a, b) => b.runs - a.runs)[0];
        const topBowler = [...allStats].sort((a, b) => b.wickets - a.wickets)[0];
        const data = [{
            metric: 'Total Players', value: allStats.length
        }, {
            metric: 'Total Runs Scored', value: totalRuns
        }, {
            metric: 'Total Wickets Taken', value: totalWickets
        }, {
            metric: 'Total Matches Played', value: totalMatches
        }, {
            metric: 'Avg Runs per Player', value: avgRuns
        }, {
            metric: 'Avg Wickets per Player', value: avgWickets
        }, {
            metric: 'Top Run Scorer', value: topScorer ? `${topScorer.name} (${topScorer.runs} runs)` : 'N/A'
        }, {
            metric: 'Top Wicket Taker', value: topBowler ? `${topBowler.name} (${topBowler.wickets} wickets)` : 'N/A'
        }];
        await ReportLog.create({ reportType: 'coach-team-statistics', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data, players: allStats });
    } catch (error) {
        console.error('Coach report team-statistics error:', error);
        res.status(500).json({ message: 'Error generating team statistics' });
    }
});

// @route   GET /api/coach/reports/individual-players
router.get('/reports/individual-players', authMiddleware, requireCoach, async (req, res) => {
    try {
        const data = await getCoachPlayerStats();
        await ReportLog.create({ reportType: 'coach-individual-players', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Coach report individual-players error:', error);
        res.status(500).json({ message: 'Error generating individual player reports' });
    }
});

// @route   GET /api/coach/reports/best-xi
router.get('/reports/best-xi', authMiddleware, requireCoach, async (req, res) => {
    try {
        const allStats = await getCoachPlayerStats();
        const batsmen = allStats.filter(p => p.role === 'Batsman').sort((a, b) => b.runs - a.runs).slice(0, 5);
        const bowlers = allStats.filter(p => p.role === 'Bowler').sort((a, b) => b.wickets - a.wickets).slice(0, 4);
        const allRounders = allStats.filter(p => p.role === 'All-rounder')
            .sort((a, b) => (b.runs + b.wickets * 20) - (a.runs + a.wickets * 20)).slice(0, 2);
        // Fill up if not enough specialists
        const selectedXI = [...batsmen, ...allRounders, ...bowlers].slice(0, 11);
        const data = selectedXI.map((p, i) => ({
            position: i + 1, playerName: p.name, role: p.role,
            runs: p.runs, wickets: p.wickets,
            battingAvg: p.battingAvg, strikeRate: p.strikeRate,
            attendanceRate: p.attendanceRate,
            selectionReason: p.role === 'Batsman'
                ? `Top scorer with ${p.runs} runs and avg of ${p.battingAvg}`
                : p.role === 'Bowler'
                ? `Took ${p.wickets} wickets with economy of ${p.economy}`
                : `All-round contribution: ${p.runs} runs & ${p.wickets} wickets`
        }));
        await ReportLog.create({ reportType: 'coach-best-xi', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Coach report best-xi error:', error);
        res.status(500).json({ message: 'Error generating Best XI report' });
    }
});

// @route   GET /api/coach/reports/training-progress
router.get('/reports/training-progress', authMiddleware, requireCoach, async (req, res) => {
    try {
        const allStats = await getCoachPlayerStats();
        const data = allStats.map(p => {
            const runsScore = Math.min(p.runs / 100, 5);
            const wicketsScore = Math.min(p.wickets / 10, 5);
            const progressRating = Math.min(10, Math.round(runsScore + wicketsScore));
            let recommendation = 'Maintain current performance level';
            if (p.runs < 200 && p.role !== 'Bowler') recommendation = 'Focus on batting technique and consistency';
            else if (p.wickets < 10 && p.role !== 'Batsman') recommendation = 'Improve bowling accuracy and variation';
            return {
                playerName: p.name, role: p.role, age: p.age,
                matches: p.matches, runs: p.runs, wickets: p.wickets,
                battingAvg: p.battingAvg, strikeRate: p.strikeRate,
                attendanceRate: p.attendanceRate,
                progressRating: `${progressRating}/10`,
                recommendation
            };
        });
        await ReportLog.create({ reportType: 'coach-training-progress', generatedBy: req.user.id, timestamp: new Date() });
        res.json({ data });
    } catch (error) {
        console.error('Coach report training-progress error:', error);
        res.status(500).json({ message: 'Error generating training progress report' });
    }
});

// ============ AI Best XI Endpoint ============

// Helper: normalize a value to 0–100 given an array of values (higher = better)
function normalizeHigher(value, allValues) {
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    if (max === min) return allValues.length > 0 ? 50 : 0;
    return ((value - min) / (max - min)) * 100;
}

// Helper: normalize (lower = better, e.g. economy rate)
function normalizeLower(value, allValues) {
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    if (max === min) return allValues.length > 0 ? 50 : 0;
    return ((max - value) / (max - min)) * 100;
}

// Helper: calculate recent form trend score
// Returns 0–100: compares avg runs/wickets in last 3 vs earlier matches
function calculateTrendScore(matchStats, statKey) {
    if (!matchStats || matchStats.length === 0) return 0;
    // Sort by matchID descending (higher matchID = more recent)
    const sorted = [...matchStats].sort((a, b) => b.matchID - a.matchID);
    const recent = sorted.slice(0, 3);
    const older = sorted.slice(3);
    const recentAvg = recent.length > 0
        ? recent.reduce((s, m) => s + (parseFloat(m[statKey]) || 0), 0) / recent.length
        : 0;
    const olderAvg = older.length > 0
        ? older.reduce((s, m) => s + (parseFloat(m[statKey]) || 0), 0) / older.length
        : recentAvg;
    if (olderAvg === 0) return recentAvg > 0 ? 75 : 50;
    const ratio = recentAvg / olderAvg;
    // ratio > 1 = improving, < 1 = declining
    return Math.min(100, Math.max(0, 50 + (ratio - 1) * 50));
}

// Helper: calculate consistency (lower standard deviation = more consistent = higher score)
function calculateConsistencyScore(matchStats, statKey) {
    if (!matchStats || matchStats.length === 0) return 50;
    const values = matchStats.map(m => parseFloat(m[statKey]) || 0);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    // Normalize: stdDev of 0 = 100 (perfectly consistent), stdDev of 50+ = 0
    return Math.max(0, 100 - (stdDev / Math.max(mean, 1)) * 100);
}

// Helper: calculate batsman composite score (0–100)
function calcBatsmanScore(playerMatchStats) {
    if (!playerMatchStats || playerMatchStats.length === 0) {
        return { score: 0, avg: 0, sr: 0, trend: 0, consistency: 0 };
    }
    const totalRuns = playerMatchStats.reduce((s, m) => s + (m.runsScored || 0), 0);
    const totalBalls = playerMatchStats.reduce((s, m) => s + (m.ballsFaced || 0), 0);
    const timesOut = playerMatchStats.filter(m => m.wasOut).length;
    const avg = timesOut > 0 ? totalRuns / timesOut : totalRuns;
    const sr = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
    const trend = calculateTrendScore(playerMatchStats, 'runsScored');
    const consistency = calculateConsistencyScore(playerMatchStats, 'runsScored');
    // Raw score (will be normalized later)
    return { rawAvg: avg, rawSR: sr, trend, consistency };
}

// Helper: calculate bowler composite score (0–100)
function calcBowlerScore(playerMatchStats) {
    if (!playerMatchStats || playerMatchStats.length === 0) {
        return { rawWPM: 0, rawEconomy: 999, trend: 0, consistency: 0 };
    }
    const totalWickets = playerMatchStats.reduce((s, m) => s + (m.wicketsTaken || 0), 0);
    const totalOvers = playerMatchStats.reduce((s, m) => s + parseFloat(m.oversBowled || 0), 0);
    const totalRunsConceded = playerMatchStats.reduce((s, m) => s + (m.runsConceded || 0), 0);
    const matches = playerMatchStats.length;
    const wpm = totalWickets / matches; // wickets per match
    const economy = totalOvers > 0 ? totalRunsConceded / totalOvers : 999; // lower is better
    const trend = calculateTrendScore(playerMatchStats, 'wicketsTaken');
    const consistency = calculateConsistencyScore(playerMatchStats, 'wicketsTaken');
    return { rawWPM: wpm, rawEconomy: economy, trend, consistency };
}

// @route   POST /api/coach/best-xi
// @desc    Generate AI Best XI based on coach config and recent match data
// @access  Coach only
router.post('/best-xi', authMiddleware, requireCoach, async (req, res) => {
    try {
        const {
            batsmen = 5,
            bowlers = 4,
            allRounders = 1,
            pitchCondition = 'Flat'
        } = req.body;

        // Validate: must total 11 (batsmen + allRounders + 1 WK + bowlers = 11)
        const wicketKeepers = 1;
        const total = parseInt(batsmen) + parseInt(bowlers) + parseInt(allRounders) + wicketKeepers;
        if (total !== 11) {
            return res.status(400).json({
                message: `Team total must be 11. Current total: ${total} (${batsmen} bat + ${allRounders} AR + 1 WK + ${bowlers} bowl)`
            });
        }

        const { Match, MatchStats, PlayerProfile } = require('../models');
        const { Op } = require('sequelize');

        // ─── Batting Position Helpers ─────────────────────────────────────────
        const getPositionGroup = (style = '') => {
            const s = (style || '').toLowerCase();
            if (s.includes('top order'))    return 'top';
            if (s.includes('middle order')) return 'middle';
            if (s.includes('finisher'))     return 'finisher';
            return 'none';
        };
        const POSITION_BONUS = 10;

        // Step 1: Get last 10 completed matches
        const recentMatches = await Match.findAll({
            where: { status: 'completed' },
            order: [['matchDate', 'DESC']],
            limit: 10,
            attributes: ['matchID', 'matchDate']
        });

        const matchesAnalyzed = recentMatches.length;
        const recentMatchIDs = recentMatches.map(m => m.matchID);

        // Step 2: Get all players with profiles
        const players = await User.findAll({
            where: { role: 'player', accountStatus: 'active' },
            attributes: { exclude: ['password'] },
            include: [{
                model: PlayerProfile,
                as: 'playerProfile',
                required: false
            }]
        });

        // Step 3: For each player, get their matchStats in the recent window
        const playerData = await Promise.all(players.map(async (player) => {
            const profile = player.playerProfile;
            const playerRole = profile?.playerRole || 'Player';
            const bowlingStyle = profile?.bowlingStyle || '';
            const battingStyle = profile?.battingStyle || '';
            const positionGroup = getPositionGroup(battingStyle);

            let recentStats = [];
            if (recentMatchIDs.length > 0) {
                recentStats = await MatchStats.findAll({
                    where: {
                        playerUserID: player.id,
                        matchID: { [Op.in]: recentMatchIDs }
                    }
                });
            }

            // Also get all-time stats for experience tie-breaking
            const allTimeStats = await MatchStats.findAll({
                where: { playerUserID: player.id },
                attributes: ['matchID']
            });
            const totalMatchesPlayed = new Set(allTimeStats.map(s => s.matchID)).size;

            const batScore = calcBatsmanScore(recentStats);
            const bowlScore = calcBowlerScore(recentStats);

            return {
                id: player.id,
                name: player.name,
                role: playerRole,
                bowlingStyle,
                battingStyle,
                photo: profile?.photoURL || null,
                positionGroup,
                totalMatchesPlayed, // for tie-breaking
                recentMatchCount: recentStats.length,
                batRaw: batScore,
                bowlRaw: bowlScore,
                // Derived aggregate stats for display
                totalRuns: recentStats.reduce((s, m) => s + (m.runsScored || 0), 0),
                totalWickets: recentStats.reduce((s, m) => s + (m.wicketsTaken || 0), 0),
                totalOvers: recentStats.reduce((s, m) => s + parseFloat(m.oversBowled || 0), 0),
                totalRunsConceded: recentStats.reduce((s, m) => s + (m.runsConceded || 0), 0),
                totalBalls: recentStats.reduce((s, m) => s + (m.ballsFaced || 0), 0),
                timesOut: recentStats.filter(m => m.wasOut).length,
            };
        }));

        // Step 4: Normalize scores across all players
        // Batting normalization
        const allAvgs = playerData.map(p => p.batRaw.rawAvg);
        const allSRs = playerData.map(p => p.batRaw.rawSR);
        const allWPMs = playerData.map(p => p.bowlRaw.rawWPM);
        const allEcons = playerData.map(p => p.bowlRaw.rawEconomy === 999 ? 0 : p.bowlRaw.rawEconomy);

        playerData.forEach(p => {
            // Batsman composite score
            const avgNorm = normalizeHigher(p.batRaw.rawAvg, allAvgs);
            const srNorm = normalizeHigher(p.batRaw.rawSR, allSRs);
            const batTrend = p.batRaw.trend || 0;
            const batConsistency = p.batRaw.consistency || 50;
            p.batsmanScore = Math.round(
                avgNorm * 0.35 +
                srNorm * 0.25 +
                batTrend * 0.20 +
                batConsistency * 0.20
            );

            // Bowler composite score (before pitch modifier)
            const wpmNorm = normalizeHigher(p.bowlRaw.rawWPM, allWPMs);
            const econNorm = normalizeLower(
                p.bowlRaw.rawEconomy === 999 ? Math.max(...allEcons) : p.bowlRaw.rawEconomy,
                allEcons.map(e => e === 0 ? Math.max(...allEcons) : e)
            );
            const bowlTrend = p.bowlRaw.trend || 0;
            const bowlConsistency = p.bowlRaw.consistency || 50;
            let bowlerScore = Math.round(
                wpmNorm * 0.35 +
                econNorm * 0.30 +
                bowlTrend * 0.20 +
                bowlConsistency * 0.15
            );

            // Step 5: Apply pitch condition modifier to BOWLERS ONLY
            let pitchBoost = 0;
            if (pitchCondition === 'Green') {
                const style = p.bowlingStyle.toLowerCase();
                if (style.includes('fast') || style.includes('medium')) {
                    pitchBoost = 15;
                }
            } else if (pitchCondition === 'Dusty') {
                const style = p.bowlingStyle.toLowerCase();
                if (style.includes('spin') || style.includes('off') || style.includes('leg')) {
                    pitchBoost = 15;
                }
            } else if (pitchCondition === 'Wet') {
                pitchBoost = 10; // all bowlers benefit
            }
            p.bowlerScore = Math.min(100, bowlerScore + pitchBoost);
            p.pitchBoost = pitchBoost;

            // All-rounder composite: 50% bat + 50% bowl
            p.allRounderScore = Math.round((p.batsmanScore * 0.5) + (p.bowlerScore * 0.5));

            // Batting average and economy for display
            p.battingAvg = p.timesOut > 0 ? (p.totalRuns / p.timesOut).toFixed(1) : p.totalRuns.toFixed(1);
            p.strikeRate = p.totalBalls > 0 ? ((p.totalRuns / p.totalBalls) * 100).toFixed(1) : '0.0';
            p.economy = p.totalOvers > 0 ? (p.totalRunsConceded / p.totalOvers).toFixed(1) : 'N/A';
        });

        // Step 6: Sort helpers (tie-break by totalMatchesPlayed — more experience wins)
        const sortBy = (arr, scoreKey) =>
            [...arr].sort((a, b) => b[scoreKey] - a[scoreKey] || b.totalMatchesPlayed - a.totalMatchesPlayed);

        // Step 7: Select players per slot
        const selected = [];
        const selectedIds = new Set();
        const arCount  = parseInt(allRounders);
        const batCount = parseInt(batsmen);

        // Position-aware pick: adds POSITION_BONUS to players whose positionGroup matches preferredGroup
        const pick = (pool, scoreKey, count, slotRole, preferredGroup = null) => {
            const available = pool.filter(p => !selectedIds.has(p.id));
            const withBonus = available.map(p => ({
                ...p,
                _score: p[scoreKey] + (preferredGroup && p.positionGroup === preferredGroup ? POSITION_BONUS : 0)
            }));
            const sorted = [...withBonus].sort((a, b) =>
                b._score - a._score || b.totalMatchesPlayed - a.totalMatchesPlayed
            );
            sorted.slice(0, count).forEach(p => {
                selectedIds.add(p.id);
                selected.push({ ...p, selectedAs: slotRole, aiScore: p[scoreKey] });
            });
        };

        // Wicket-keeper first (playerRole = 'Wicket-keeper')
        const wkPool = playerData.filter(p =>
            p.role.toLowerCase() === 'wicket-keeper' ||
            p.role.toLowerCase() === 'wicket keeper'
        );
        if (wkPool.length > 0) {
            pick(wkPool, 'batsmanScore', 1, 'Wicket-keeper');
        } else {
            pick(playerData, 'batsmanScore', 1, 'Wicket-keeper (fill)');
        }

        // All-rounders — prefer Finisher batting style (natural lower-order hitters)
        if (arCount > 0) {
            const arPool = playerData.filter(p =>
                p.role.toLowerCase().includes('all-rounder') ||
                p.role.toLowerCase().includes('allrounder') ||
                p.role.toLowerCase().includes('all rounder')
            );
            pick(arPool, 'allRounderScore', arCount, 'All-rounder', 'finisher');
        }

        // Batsmen — Top Order (3 slots) first, then Middle Order
        const batPool = playerData.filter(p =>
            p.role.toLowerCase().includes('batsman') ||
            p.role.toLowerCase().includes('batter') ||
            p.role.toLowerCase().includes('opener')
        );
        const topOrderSlots    = Math.min(3, batCount); // Openers + No.3
        const middleOrderSlots = batCount - topOrderSlots;

        // Top-order slots: +10 bonus for 'top order' batting style
        pick(batPool, 'batsmanScore', topOrderSlots, 'Batsman', 'top');

        // Middle-order slots: +10 for 'middle order' style
        // If no AR slots (5-bowler lineup), prefer 'finisher' style instead (high-SR lower hitters)
        if (middleOrderSlots > 0) {
            const midPreferGroup = arCount === 0 ? 'finisher' : 'middle';
            pick(batPool, 'batsmanScore', middleOrderSlots, 'Batsman', midPreferGroup);
        }

        // Bowlers
        const bowlPool = playerData.filter(p =>
            p.role.toLowerCase().includes('bowler') ||
            p.role.toLowerCase().includes('pacer') ||
            p.role.toLowerCase().includes('spinner')
        );
        pick(bowlPool, 'bowlerScore', parseInt(bowlers), 'Bowler');

        // Fill if still < 11 (insufficient role-specific players)
        if (selected.length < 11) {
            const remaining = 11 - selected.length;
            const fillPool = sortBy(
                playerData.filter(p => !selectedIds.has(p.id)),
                'batsmanScore'
            );
            fillPool.slice(0, remaining).forEach(p => {
                selectedIds.add(p.id);
                selected.push({ ...p, selectedAs: 'Flexible', aiScore: p.batsmanScore });
            });
        }

        // Step 8: Build rationale and response
        const xi = selected.map((p, i) => {
            let rationale = '';
            if (p.selectedAs === 'Wicket-keeper' || p.selectedAs === 'Wicket-keeper (fill)') {
                rationale = p.recentMatchCount > 0
                    ? `Best keeping option with batting avg of ${p.battingAvg} in last ${p.recentMatchCount} matches`
                    : `Selected as keeper with ${p.totalMatchesPlayed} matches of experience`;
            } else if (p.selectedAs === 'Batsman') {
                const posPfx = p.positionGroup === 'top' ? 'Top-order' :
                               p.positionGroup === 'middle' ? 'Middle-order' :
                               p.positionGroup === 'finisher' ? 'Finisher' : '';
                const batLabel = posPfx ? `${posPfx} batsman` : 'Batsman';
                rationale = p.recentMatchCount > 0
                    ? `${batLabel}: scored ${p.totalRuns} runs at avg ${p.battingAvg} with SR ${p.strikeRate} in recent ${p.recentMatchCount} matches`
                    : `${batLabel} with ${p.totalMatchesPlayed} matches of batting experience`;
            } else if (p.selectedAs === 'Bowler') {
                const pitchNote = p.pitchBoost > 0 ? ` (+${p.pitchBoost} ${pitchCondition} pitch bonus)` : '';
                rationale = p.recentMatchCount > 0
                    ? `Took ${p.totalWickets} wickets at economy ${p.economy} in last ${p.recentMatchCount} matches${pitchNote}`
                    : `Selected for bowling with ${p.totalMatchesPlayed} matches of experience${pitchNote}`;
            } else if (p.selectedAs === 'All-rounder') {
                rationale = p.recentMatchCount > 0
                    ? `${p.totalRuns} runs and ${p.totalWickets} wickets — balanced all-round contribution`
                    : `All-round player with ${p.totalMatchesPlayed} matches of experience`;
            } else {
                rationale = `Versatile player filling squad balance`;
            }

            return {
                position: i + 1,
                playerId: p.id,
                playerName: p.name,
                selectedAs: p.selectedAs,
                role: p.role,
                bowlingStyle: p.bowlingStyle,
                battingStyle: p.battingStyle,
                battingPosition: p.positionGroup === 'top'     ? 'Top Order'    :
                                 p.positionGroup === 'middle'   ? 'Middle Order' :
                                 p.positionGroup === 'finisher' ? 'Finisher'     : null,
                photo: p.photo,
                aiScore: Math.min(100, Math.max(0, p.aiScore)),
                batsmanScore: Math.min(100, Math.max(0, p.batsmanScore)),
                bowlerScore: Math.min(100, Math.max(0, p.bowlerScore)),
                pitchBoost: p.pitchBoost,
                rationale,
                recentStats: {
                    matchesInWindow: p.recentMatchCount,
                    runs: p.totalRuns,
                    wickets: p.totalWickets,
                    battingAvg: p.battingAvg,
                    strikeRate: p.strikeRate,
                    economy: p.economy,
                    overs: parseFloat(p.totalOvers.toFixed(1))
                },
                experience: {
                    totalMatches: p.totalMatchesPlayed
                }
            };
        });

        res.json({
            xi,
            matchesAnalyzed,
            config: {
                batsmen: parseInt(batsmen),
                bowlers: parseInt(bowlers),
                allRounders: parseInt(allRounders),
                wicketKeepers,
                pitchCondition
            },
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Best XI generation error:', error);
        res.status(500).json({ message: 'Server error while generating Best XI', error: error.message });
    }
});

module.exports = router;

