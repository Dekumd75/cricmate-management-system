const express = require('express');
const { User, PlayerProfile, MatchStats } = require('../models');
const { authMiddleware, requirePlayer } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/player/profile
// @desc    Get current logged in player's profile
// @access  Private (Player only)
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const player = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{
                model: PlayerProfile,
                as: 'playerProfile',
                required: false
            }]
        });

        if (!player) {
            return res.status(404).json({ message: 'Player not found' });
        }

        // Format player data to match frontend expectations
        const profile = player.playerProfile;
        const age = profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 0;

        const formattedPlayer = {
            id: player.id.toString(),
            name: player.name,
            email: player.email,
            phone: player.phone,
            age: age,
            role: profile?.playerRole || 'Player',
            photo: profile?.photoURL || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200',
            // Mock stats for now until Match/Stats tables are populated
            stats: {
                matches: 0,
                runs: 0,
                wickets: 0,
                average: 0,
                strikeRate: 0,
                economy: 0
            },
            inviteCode: 'FSCA-XXXX', // Could fetch real code if needed
            parentId: null
        };

        res.json({ player: formattedPlayer });
    } catch (error) {
        console.error('Get player profile error:', error);
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
});

// @route   GET /api/player/:playerId/info
// @desc    Get basic info for any player (name, age, role, photo)
// @access  Private (any authenticated user)
router.get('/:playerId/info', authMiddleware, async (req, res) => {
    try {
        const { playerId } = req.params;

        const player = await User.findByPk(playerId, {
            attributes: { exclude: ['password'] },
            include: [{
                model: PlayerProfile,
                as: 'playerProfile',
                required: false
            }]
        });

        if (!player) {
            return res.status(404).json({ message: 'Player not found' });
        }

        const profile = player.playerProfile;
        const age = profile?.dob
            ? new Date().getFullYear() - new Date(profile.dob).getFullYear()
            : 0;

        res.json({
            player: {
                id: player.id.toString(),
                name: player.name,
                age,
                role: profile?.playerRole || 'Player',
                photo: profile?.photoURL || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200'
            }
        });
    } catch (error) {
        console.error('Get player info error:', error);
        res.status(500).json({ message: 'Server error while fetching player info' });
    }
});

// @route   GET /api/player/:playerId/stats
// @desc    Get player overall statistics
// @access  Private
router.get('/:playerId/stats', authMiddleware, async (req, res) => {
    try {
        const { playerId } = req.params;

        // Get all match stats for player
        const matchStats = await MatchStats.findAll({
            where: { playerUserID: playerId }
        });

        // Calculate overall statistics
        const totalMatches = matchStats.length;
        const totalRuns = matchStats.reduce((sum, stat) => sum + (stat.runsScored || 0), 0);
        const totalWickets = matchStats.reduce((sum, stat) => sum + (stat.wicketsTaken || 0), 0);
        const totalCatches = matchStats.reduce((sum, stat) => sum + (stat.catches || 0), 0);
        const totalFours = matchStats.reduce((sum, stat) => sum + (stat.fours || 0), 0);
        const totalSixes = matchStats.reduce((sum, stat) => sum + (stat.sixes || 0), 0);
        const totalBallsFaced = matchStats.reduce((sum, stat) => sum + (stat.ballsFaced || 0), 0);
        const totalOversBowled = matchStats.reduce((sum, stat) => sum + (parseFloat(stat.oversBowled) || 0), 0);
        const totalRunsConceded = matchStats.reduce((sum, stat) => sum + (stat.runsConceded || 0), 0);

        const average = totalMatches > 0 ? (totalRuns / totalMatches).toFixed(2) : 0;
        const strikeRate = totalBallsFaced > 0 ? ((totalRuns / totalBallsFaced) * 100).toFixed(2) : 0;
        const economy = totalOversBowled > 0 ? (totalRunsConceded / totalOversBowled).toFixed(2) : 0;

        res.json({
            stats: {
                matches: totalMatches,
                runs: totalRuns,
                wickets: totalWickets,
                catches: totalCatches,
                fours: totalFours,
                sixes: totalSixes,
                average: parseFloat(average),
                strikeRate: parseFloat(strikeRate),
                economy: parseFloat(economy)
            }
        });
    } catch (error) {
        console.error('Get player stats error:', error);
        res.status(500).json({ message: 'Server error while fetching player statistics' });
    }
});

// @route   GET /api/player/:playerId/match-history
// @desc    Get per-match stats for a player (for performance charts)
// @access  Private
router.get('/:playerId/match-history', authMiddleware, async (req, res) => {
    try {
        const { playerId } = req.params;
        const { Match, Opponent } = require('../models');

        const matchStats = await MatchStats.findAll({
            where: { playerUserID: playerId },
            include: [{
                model: Match,
                as: 'match',
                include: [{ model: Opponent, as: 'opponent' }]
            }],
            order: [[{ model: Match, as: 'match' }, 'matchDate', 'ASC']]
        });

        const history = matchStats.map(stat => ({
            matchId: stat.matchID,
            opponent: stat.match?.opponent?.opponentName || 'Unknown',
            date: stat.match?.matchDate || null,
            venue: stat.match?.venue || '',
            result: stat.match?.result || null,
            runs: stat.runsScored || 0,
            wickets: stat.wicketsTaken || 0,
            fours: stat.fours || 0,
            sixes: stat.sixes || 0,
            catches: stat.catches || 0,
            oversBowled: parseFloat(stat.oversBowled) || 0,
            runsConceded: stat.runsConceded || 0,
            isOut: stat.wasOut || false
        }));

        res.json({ history });
    } catch (error) {
        console.error('Get player match history error:', error);
        res.status(500).json({ message: 'Server error while fetching match history' });
    }
});

// @route   PUT /api/player/profile/update
// @desc    Update player profile
// @access  Private
router.put('/profile/update', authMiddleware, async (req, res) => {
    try {
        const { battingStyle, bowlingStyle, playerRole, photoURL } = req.body;

        // Find or create player profile
        let profile = await PlayerProfile.findOne({
            where: { playerUserID: req.user.id }
        });

        if (profile) {
            // Update existing profile
            await profile.update({
                battingStyle: battingStyle || profile.battingStyle,
                bowlingStyle: bowlingStyle || profile.bowlingStyle,
                playerRole: playerRole || profile.playerRole,
                photoURL: photoURL || profile.photoURL
            });
        } else {
            // Create new profile
            profile = await PlayerProfile.create({
                playerUserID: req.user.id,
                battingStyle,
                bowlingStyle,
                playerRole,
                photoURL
            });
        }

        res.json({
            message: 'Profile updated successfully',
            profile
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error while updating profile' });
    }
});

module.exports = router;
