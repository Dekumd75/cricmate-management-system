const express = require('express');
const { Opponent } = require('../models');
const { authMiddleware, requireCoach } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/opponent/all
// @desc    Get all opponents
// @access  Coach/Admin only
router.get('/all', authMiddleware, requireCoach, async (req, res) => {
    try {
        const opponents = await Opponent.findAll({
            order: [['opponentName', 'ASC']]
        });

        res.json({ opponents });
    } catch (error) {
        console.error('Get opponents error:', error);
        res.status(500).json({ message: 'Server error while fetching opponents' });
    }
});

// @route   POST /api/opponent/create
// @desc    Create new opponent
// @access  Coach/Admin only
router.post('/create', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { name, contactInfo } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Please provide opponent name' });
        }

        // Check if opponent already exists
        const existingOpponent = await Opponent.findOne({
            where: { opponentName: name }
        });

        if (existingOpponent) {
            return res.status(400).json({ message: 'Opponent already exists' });
        }

        const opponent = await Opponent.create({
            opponentName: name,
            contactInfo: contactInfo || null
        });

        res.status(201).json({
            message: 'Opponent created successfully',
            opponent
        });
    } catch (error) {
        console.error('Create opponent error:', error);
        res.status(500).json({ message: 'Server error while creating opponent' });
    }
});

module.exports = router;
