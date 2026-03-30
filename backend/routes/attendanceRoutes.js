const express = require('express');
const { AttendanceRecord, User, Session } = require('../models');
const { authMiddleware, requireCoach } = require('../middleware/authMiddleware');

const router = express.Router();

//  @route   POST /api/attendance/mark
// @desc    Mark attendance for player(s) in a session
// @access  Coach/Admin only
router.post('/mark', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { date, sessionID, attendanceRecords } = req.body;

        console.log('=== Mark Attendance Request ===');
        console.log('Date:', date);
        console.log('SessionID:', sessionID);
        console.log('Records:', attendanceRecords);

        if (!date || !sessionID || !attendanceRecords || !Array.isArray(attendanceRecords)) {
            return res.status(400).json({ message: 'Please provide date, sessionID, and attendance records' });
        }

        // Get session to use its start time for check-in
        const session = await Session.findByPk(sessionID);
        if (!session) {
            console.error('Session not found:', sessionID);
            return res.status(404).json({ message: 'Session not found' });
        }

        console.log('Found session:', session.sessionID, 'Start time:', session.startTime);

        const savedRecords = [];
        const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS format
        const sessionStartTime = session.startTime; // Use session start time for check-in

        for (const record of attendanceRecords) {
            const { playerId, status } = record;

            if (!playerId || !status) {
                console.log('Skipping invalid record:', record);
                continue;
            }

            console.log(`Processing player ${playerId} with status ${status}`);

            // Check if attendance already exists for this player, date, and session
            const existing = await AttendanceRecord.findOne({
                where: {
                    playerUserID: playerId,
                    attendanceDate: date,
                    sessionID
                }
            });

            if (existing) {
                console.log('Updating existing record:', existing.recordID);

                // Update existing record
                const updateData = {
                    status,
                    markedBy: req.user.id
                };

                // Set check-in time to session start time when marking present (if not already set)
                if (status === 'present' && !existing.checkInTime) {
                    updateData.checkInTime = sessionStartTime;
                }

                // Set check-out time to current time when marking early-leave
                if (status === 'early-leave') {
                    updateData.checkOutTime = currentTime;
                    // Set check-in to session start if not already set
                    if (!existing.checkInTime) {
                        updateData.checkInTime = sessionStartTime;
                    }
                }

                console.log('Update data:', updateData);
                await existing.update(updateData);

                // Fetch updated record with associations
                const updatedRecord = await AttendanceRecord.findByPk(existing.recordID, {
                    include: [{ model: User, as: 'player', attributes: ['id', 'name'] }]
                });
                savedRecords.push(updatedRecord);
                console.log('Updated record saved');
            } else {
                console.log('Creating new record for player:', playerId);

                // Create new record
                const newRecordData = {
                    playerUserID: playerId,
                    attendanceDate: date,
                    sessionID,
                    status,
                    markedBy: req.user.id,
                    checkInTime: null,
                    checkOutTime: null
                };

                // Set check-in time to session start time for present
                if (status === 'present') {
                    newRecordData.checkInTime = sessionStartTime;
                }

                // Set check-in to session start and checkout to current time for early-leave
                if (status === 'early-leave') {
                    newRecordData.checkInTime = sessionStartTime;
                    newRecordData.checkOutTime = currentTime;
                }

                console.log('New record data:', newRecordData);
                const newRecord = await AttendanceRecord.create(newRecordData);
                console.log('Created record ID:', newRecord.recordID);

                // Fetch created record with associations
                const createdRecord = await AttendanceRecord.findByPk(newRecord.recordID, {
                    include: [{ model: User, as: 'player', attributes: ['id', 'name'] }]
                });
                savedRecords.push(createdRecord);
                console.log('New record saved');
            }
        }

        console.log('Total records saved:', savedRecords.length);
        res.json({
            message: 'Attendance marked successfully',
            records: savedRecords
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error while marking attendance', error: error.message });
    }
});

// @route   GET /api/attendance/date/:date
// @desc    Get attendance for specific date
// @access  Coach/Admin only
router.get('/date/:date', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { date } = req.params;

        const records = await AttendanceRecord.findAll({
            where: { attendanceDate: date },
            include: [
                { model: User, as: 'player', attributes: ['id', 'name'] },
                { model: User, as: 'marker', attributes: ['id', 'name'] }
            ]
        });

        res.json({ records });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ message: 'Server error while fetching attendance' });
    }
});

// @route   GET /api/attendance/player/:playerId
// @desc    Get player attendance history
// @access  Coach/Admin/Player only
router.get('/player/:playerId', authMiddleware, async (req, res) => {
    try {
        const { playerId } = req.params;
        const { startDate, endDate } = req.query;

        const whereClause = { playerUserID: playerId };

        if (startDate && endDate) {
            whereClause.attendanceDate = {
                [require('sequelize').Op.between]: [startDate, endDate]
            };
        }

        const records = await AttendanceRecord.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'marker', attributes: ['id', 'name'] }
            ],
            order: [['attendanceDate', 'DESC']]
        });

        res.json({ records });
    } catch (error) {
        console.error('Get player attendance error:', error);
        res.status(500).json({ message: 'Server error while fetching player attendance' });
    }
});

// @route   GET /api/attendance/summary
// @desc    Get attendance summary
// @access  Coach/Admin only
router.get('/summary', authMiddleware, requireCoach, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Get all players
        const players = await User.findAll({
            where: { role: 'player' },
            attributes: ['id', 'name']
        });

        const summary = [];

        for (const player of players) {
            const whereClause = { playerUserID: player.id };

            if (startDate && endDate) {
                whereClause.attendanceDate = {
                    [require('sequelize').Op.between]: [startDate, endDate]
                };
            }

            const totalRecords = await AttendanceRecord.count({
                where: whereClause
            });

            const presentRecords = await AttendanceRecord.count({
                where: { ...whereClause, status: 'present' }
            });

            const absentRecords = await AttendanceRecord.count({
                where: { ...whereClause, status: 'absent' }
            });

            const earlyLeaveRecords = await AttendanceRecord.count({
                where: { ...whereClause, status: 'early-leave' }
            });

            const attendanceRate = totalRecords > 0
                ? Math.round((presentRecords / totalRecords) * 100)
                : 0;

            summary.push({
                playerId: player.id,
                playerName: player.name,
                totalDays: totalRecords,
                presentDays: presentRecords,
                absentDays: absentRecords,
                earlyLeaveDays: earlyLeaveRecords,
                attendanceRate
            });
        }

        res.json({ summary });
    } catch (error) {
        console.error('Get attendance summary error:', error);
        res.status(500).json({ message: 'Server error while fetching attendance summary' });
    }
});

module.exports = router;
