const express = require('express');
const { User, PlayerProfile } = require('../models');
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

module.exports = router;
