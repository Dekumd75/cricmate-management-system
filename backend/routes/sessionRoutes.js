const express = require('express');
const router = express.Router();
const { Session, PlayerGroup, AttendanceRecord, User } = require('../models');
const { authMiddleware, requireCoach } = require('../middleware/authMiddleware');

// @route   POST /api/session/start
// @desc    Start a new training session
// @access  Coach/Admin
router.post('/start', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { groupID, title, customGroupName, customLocation } = req.body;

        let finalGroupID = groupID;
        let group;

        // If groupID is 0, create a custom/temporary group
        if (groupID === 0 || groupID === '0') {
            if (!customGroupName || !customLocation) {
                return res.status(400).json({ message: 'Custom group name and location are required' });
            }

            // Check if this custom group already exists
            const existingGroup = await PlayerGroup.findOne({
                where: {
                    groupName: customGroupName,
                    location: customLocation
                }
            });

            if (existingGroup) {
                finalGroupID = existingGroup.groupID;
                group = existingGroup;
            } else {
                // Create new custom group
                group = await PlayerGroup.create({
                    groupName: customGroupName,
                    location: customLocation
                });
                finalGroupID = group.groupID;
            }
        } else {
            if (!groupID) {
                return res.status(400).json({ message: 'Group ID is required' });
            }

            // Verify group exists
            group = await PlayerGroup.findByPk(groupID);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }
        }

        const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Create session
        const session = await Session.create({
            title: title || `${group.groupName} - ${group.location}`,
            sessionDate: currentDate,
            startTime: currentTime,
            coachID: req.user.id,
            groupID: finalGroupID,
            status: 'active'
        });

        // Fetch complete session with group details
        const sessionWithDetails = await Session.findByPk(session.sessionID, {
            include: [{
                model: PlayerGroup,
                as: 'group'
            }]
        });

        res.json({
            message: 'Session started successfully',
            session: sessionWithDetails
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ message: 'Server error while starting session' });
    }
});

// @route   POST /api/session/:sessionId/end
// @desc    End a session and set checkout times for present players
// @access  Coach/Admin
router.post('/:sessionId/end', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Verify coach owns this session
        if (session.coachID !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to end this session' });
        }

        if (session.status === 'completed') {
            return res.status(400).json({ message: 'Session already completed' });
        }

        const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

        // Update session end time and status
        await session.update({
            endTime: currentTime,
            status: 'completed'
        });

        // Find all attendance records for this session where player is marked present
        // and checkout time is not set (meaning they didn't leave early)
        const attendanceRecords = await AttendanceRecord.findAll({
            where: {
                sessionID: sessionId,
                status: 'present',
                checkOutTime: null
            }
        });

        // Update checkout time for all present players
        const updatePromises = attendanceRecords.map(record =>
            record.update({ checkOutTime: currentTime })
        );
        await Promise.all(updatePromises);

        res.json({
            message: 'Session ended successfully',
            session,
            playersCheckedOut: attendanceRecords.length
        });
    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ message: 'Server error while ending session' });
    }
});

// @route   GET /api/session/active
// @desc    Get coach's active sessions
// @access  Coach/Admin
router.get('/active', authMiddleware, requireCoach, async (req, res) => {
    try {
        const sessions = await Session.findAll({
            where: {
                coachID: req.user.id,
                status: 'active'
            },
            include: [{
                model: PlayerGroup,
                as: 'group'
            }],
            order: [['sessionDate', 'DESC'], ['startTime', 'DESC']]
        });

        res.json({ sessions });
    } catch (error) {
        console.error('Get active sessions error:', error);
        res.status(500).json({ message: 'Server error while fetching active sessions' });
    }
});

// @route   GET /api/session/all
// @desc    Get all sessions (with optional filters)
// @access  Coach/Admin
router.get('/all', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { status, date, groupID } = req.query;
        const where = {};

        if (status) where.status = status;
        if (date) where.sessionDate = date;
        if (groupID) where.groupID = groupID;

        const sessions = await Session.findAll({
            where,
            include: [{
                model: PlayerGroup,
                as: 'group'
            }, {
                model: User,
                as: 'coach',
                attributes: ['id', 'name', 'email']
            }],
            order: [['sessionDate', 'DESC'], ['startTime', 'DESC']]
        });

        res.json({ sessions });
    } catch (error) {
        console.error('Get all sessions error:', error);
        res.status(500).json({ message: 'Server error while fetching sessions' });
    }
});

// @route   GET /api/session/:sessionId/attendance
// @desc    Get attendance for a specific session
// @access  Coach/Admin
router.get('/:sessionId/attendance', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findByPk(sessionId, {
            include: [{
                model: PlayerGroup,
                as: 'group'
            }]
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const attendanceRecords = await AttendanceRecord.findAll({
            where: { sessionID: sessionId },
            include: [{
                model: User,
                as: 'player',
                attributes: ['id', 'name', 'email']
            }]
        });

        res.json({
            session,
            attendance: attendanceRecords
        });
    } catch (error) {
        console.error('Get session attendance error:', error);
        res.status(500).json({ message: 'Server error while fetching session attendance' });
    }
});

// @route   GET /api/session/groups
// @desc    Get all player groups
// @access  Coach/Admin
router.get('/groups', authMiddleware, requireCoach, async (req, res) => {
    try {
        const groups = await PlayerGroup.findAll({
            order: [['location', 'ASC'], ['groupName', 'ASC']]
        });

        res.json({ groups });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ message: 'Server error while fetching groups' });
    }
});

module.exports = router;
