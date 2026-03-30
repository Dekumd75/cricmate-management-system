const express = require('express');
const { Match, MatchStats, Opponent, User } = require('../models');
const { authMiddleware, requireCoach } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/match/create
// @desc    Create new match
// @access  Coach/Admin only
router.post('/create', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { opponent, date, venue, matchType, result } = req.body;

        // Validate input
        if (!opponent || !date || !venue) {
            return res.status(400).json({ message: 'Please provide opponent, date, and venue' });
        }

        // Find or create opponent
        let opponentRecord = await Opponent.findOne({ where: { opponentName: opponent } });

        if (!opponentRecord) {
            opponentRecord = await Opponent.create({ opponentName: opponent });
        }

        // Create match
        const match = await Match.create({
            opponentID: opponentRecord.opponentID,
            matchDate: date,
            venue,
            matchType: matchType || 'Practice match',
            result: result || null,
            status: 'pending',
            squadIds: [],
            createdBy: req.user.id
        });

        // Return match with opponent info
        const matchWithOpponent = await Match.findByPk(match.matchID, {
            include: [{ model: Opponent, as: 'opponent' }]
        });

        res.status(201).json({
            message: 'Match created successfully',
            match: matchWithOpponent
        });
    } catch (error) {
        console.error('Create match error:', error);
        res.status(500).json({ message: 'Server error while creating match' });
    }
});

// @route   POST /api/match/:matchId/confirm-squad
// @desc    Confirm squad for match
// @access  Coach/Admin only
router.post('/:matchId/confirm-squad', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { squadIds } = req.body;

        if (!squadIds || !Array.isArray(squadIds) || squadIds.length === 0) {
            return res.status(400).json({ message: 'Please provide squad player IDs' });
        }

        const match = await Match.findByPk(matchId);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        // Validate all player IDs exist
        const players = await User.findAll({
            where: { id: squadIds, role: 'player' }
        });

        if (players.length !== squadIds.length) {
            return res.status(400).json({ message: 'Some player IDs are invalid' });
        }

        // Update match with squad
        await match.update({
            squadIds: squadIds,
            status: 'squad-confirmed'
        });

        res.json({
            message: 'Squad confirmed successfully',
            match
        });
    } catch (error) {
        console.error('Confirm squad error:', error);
        res.status(500).json({ message: 'Server error while confirming squad' });
    }
});

// @route   POST /api/match/:matchId/update-stats
// @desc    Save player statistics for match
// @access  Coach/Admin only
router.post('/:matchId/update-stats', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { playerStats, result } = req.body;

        if (!playerStats || !Array.isArray(playerStats)) {
            return res.status(400).json({ message: 'Please provide player statistics' });
        }

        const match = await Match.findByPk(matchId);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        // Save stats for each player (upsert: update if exists, create if not)
        for (const stats of playerStats) {
            const existing = await MatchStats.findOne({
                where: { matchID: matchId, playerUserID: stats.playerId }
            });

            if (existing) {
                await existing.update({
                    runsScored: stats.runs || 0,
                    fours: stats.fours || 0,
                    sixes: stats.sixes || 0,
                    wicketsTaken: stats.wickets || 0,
                    oversBowled: stats.oversBowled || 0,
                    runsConceded: stats.runsConceded || 0,
                    catches: stats.catches || 0,
                    stumping: stats.stumps || 0,
                    wasOut: stats.isOut || false
                });
            } else {
                await MatchStats.create({
                    matchID: matchId,
                    playerUserID: stats.playerId,
                    runsScored: stats.runs || 0,
                    fours: stats.fours || 0,
                    sixes: stats.sixes || 0,
                    wicketsTaken: stats.wickets || 0,
                    oversBowled: stats.oversBowled || 0,
                    runsConceded: stats.runsConceded || 0,
                    catches: stats.catches || 0,
                    stumping: stats.stumps || 0,
                    wasOut: stats.isOut || false
                });
            }
        }

        // Update match result if provided (but don't change status)
        if (result) {
            await match.update({ result });
        }


        res.json({
            message: 'Match statistics saved successfully',
            match
        });
    } catch (error) {
        console.error('Update match stats error:', error);
        res.status(500).json({ message: 'Server error while saving statistics' });
    }
});

// @route   POST /api/match/:matchId/complete
// @desc    Mark match as completed
// @access  Coach/Admin only
router.post('/:matchId/complete', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { matchId } = req.params;

        const match = await Match.findByPk(matchId);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        // Update match status to completed
        await match.update({ status: 'completed' });

        res.json({
            message: 'Match marked as completed',
            match
        });
    } catch (error) {
        console.error('Complete match error:', error);
        res.status(500).json({ message: 'Server error while completing match' });
    }
});

// @route   GET /api/match/all
// @desc    Get all matches
// @access  Coach/Admin only
router.get('/all', authMiddleware, requireCoach, async (req, res) => {
    try {
        const matches = await Match.findAll({
            include: [
                { model: Opponent, as: 'opponent' },
                { model: User, as: 'creator', attributes: ['id', 'name'] }
            ],
            order: [['matchDate', 'DESC']]
        });

        res.json({ matches });
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ message: 'Server error while fetching matches' });
    }
});

// @route   GET /api/match/:matchId
// @desc    Get match details
// @access  Coach/Admin only
router.get('/:matchId', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { matchId } = req.params;

        const match = await Match.findByPk(matchId, {
            include: [
                { model: Opponent, as: 'opponent' },
                { model: User, as: 'creator', attributes: ['id', 'name'] },
                {
                    model: MatchStats,
                    as: 'stats',
                    include: [{ model: User, as: 'player', attributes: ['id', 'name'] }]
                }
            ]
        });

        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        res.json({ match });
    } catch (error) {
        console.error('Get match error:', error);
        res.status(500).json({ message: 'Server error while fetching match' });
    }
});

// @route   GET /api/match/:matchId/stats
// @desc    Get match statistics
// @access  Coach/Admin only
router.get('/:matchId/stats', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { matchId } = req.params;

        const stats = await MatchStats.findAll({
            where: { matchID: matchId },
            include: [
                { model: User, as: 'player', attributes: ['id', 'name'] }
            ]
        });

        res.json({ stats });
    } catch (error) {
        console.error('Get match stats error:', error);
        res.status(500).json({ message: 'Server error while fetching match statistics' });
    }
});

module.exports = router;
