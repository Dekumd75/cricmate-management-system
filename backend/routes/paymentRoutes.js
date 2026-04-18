const express = require('express');
const { Op } = require('sequelize');
const { User, Fee, Payment, AuditLog, Message, Notification } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sendPaymentReminderEmail, sendPaymentOverdueEmail, sendPaymentConfirmationEmail } = require('../services/emailService');

const router = express.Router();

const MONTHLY_FEE = parseFloat(process.env.MONTHLY_FEE_AMOUNT) || 3000;

// ─── Helper: get linked parent(s) for a player ───────────────────────────────
async function getParentForPlayer(playerUserId) {
    const sequelize = require('../config/database');
    const [rows] = await sequelize.query(
        'SELECT parentUserID FROM parentplayerlink WHERE playerUserID = ?',
        { replacements: [playerUserId] }
    );
    return rows.map(r => r.parentUserID);
}

// ─── Helper: get the coach who approved a parent ─────────────────────────────
async function getApprovingCoach(parentUserId) {
    const log = await AuditLog.findOne({
        where: {
            action: 'PARENT_APPROVED_BY_COACH',
            entityID: parentUserId
        },
        order: [['timestamp', 'DESC']]
    });
    return log ? log.userID : null;
}

// ─── Helper: generate fee records for current month ──────────────────────────
async function generateMonthlyFees() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    // Due on the 14th of the current month
    const dueDate = new Date(year, month - 1, 14);

    const players = await User.findAll({
        where: { role: 'player', accountStatus: 'active' }
    });

    let created = 0;
    let skipped = 0;

    for (const player of players) {
        const existing = await Fee.findOne({
            where: { playerUserID: player.id, month, year }
        });
        if (existing) { skipped++; continue; }

        await Fee.create({
            playerUserID: player.id,
            month,
            year,
            amountDue: MONTHLY_FEE,
            dueDate,
            status: 'pending'
        });
        created++;
    }

    console.log(`[Fee Generation] Month ${month}/${year}: created=${created}, skipped=${skipped}`);
    return { created, skipped, month, year };
}

// ─── DELETE /api/payments/clear-all  (TEMP — dev/demo only) ──────────────────
// Wipes ALL fee and payment data using raw SQL (bypasses FK constraints)
router.delete('/clear-all', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'coach') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const sequelize = require('../config/database');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
        await sequelize.query('TRUNCATE TABLE payment;');
        await sequelize.query('TRUNCATE TABLE fee;');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

        console.log('[clear-all] payment + fee tables truncated by user', req.user.id);
        res.json({ message: 'All payment and fee data cleared successfully.' });
    } catch (error) {
        console.error('clear-all error:', error);
        res.status(500).json({ message: 'Failed to clear data: ' + error.message });
    }
});

// ─── GET /api/payments/fees/my  (parent) ─────────────────────────────────────
router.get('/fees/my', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get all children linked to this parent
        const sequelize = require('../config/database');
        const [links] = await sequelize.query(
            'SELECT playerUserID FROM parentplayerlink WHERE parentUserID = ?',
            { replacements: [req.user.id] }
        );
        const playerIds = links.map(l => l.playerUserID);

        if (playerIds.length === 0) {
            return res.json({ fees: [] });
        }

        const fees = await Fee.findAll({
            where: { playerUserID: { [Op.in]: playerIds } },
            include: [{ model: User, as: 'player', attributes: ['id', 'name', 'email'] }],
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        const formatted = fees.map(f => ({
            feeID: f.feeID,
            playerID: f.playerUserID,
            playerName: f.player?.name || 'Unknown',
            playerEmail: f.player?.email || '',
            month: f.month,
            year: f.year,
            amountDue: parseFloat(f.amountDue),
            dueDate: f.dueDate,
            status: f.status
        }));

        res.json({ fees: formatted });
    } catch (error) {
        console.error('Get parent fees error:', error);
        res.status(500).json({ message: 'Server error while fetching fees' });
    }
});

// ─── GET /api/payments/fees/player  (player, read-only) ──────────────────────
router.get('/fees/player', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'player') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const fees = await Fee.findAll({
            where: { playerUserID: req.user.id },
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        const formatted = fees.map(f => ({
            feeID: f.feeID,
            playerID: f.playerUserID,
            month: f.month,
            year: f.year,
            amountDue: parseFloat(f.amountDue),
            dueDate: f.dueDate,
            status: f.status
        }));

        res.json({ fees: formatted });
    } catch (error) {
        console.error('Get player fees error:', error);
        res.status(500).json({ message: 'Server error while fetching fees' });
    }
});

// ─── GET /api/payments/fees/all  (coach) ─────────────────────────────────────
router.get('/fees/all', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'coach' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const where = {};
        if (req.query.month) where.month = parseInt(req.query.month);
        if (req.query.year) where.year = parseInt(req.query.year);
        if (req.query.status) where.status = req.query.status;

        const fees = await Fee.findAll({
            where,
            include: [{ model: User, as: 'player', attributes: ['id', 'name', 'email'] }],
            order: [['year', 'DESC'], ['month', 'DESC'], ['playerUserID', 'ASC']]
        });

        const formatted = fees.map(f => ({
            feeID: f.feeID,
            playerID: f.playerUserID,
            playerName: f.player?.name || 'Unknown',
            playerEmail: f.player?.email || '',
            month: f.month,
            year: f.year,
            amountDue: parseFloat(f.amountDue),
            dueDate: f.dueDate,
            status: f.status
        }));

        res.json({ fees: formatted });
    } catch (error) {
        console.error('Get all fees error:', error);
        res.status(500).json({ message: 'Server error while fetching fees' });
    }
});

// ─── GET /api/payments/summary ────────────────────────────────────────────────
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        let where = {};

        if (req.user.role === 'parent') {
            const sequelize = require('../config/database');
            const [links] = await sequelize.query(
                'SELECT playerUserID FROM parentplayerlink WHERE parentUserID = ?',
                { replacements: [req.user.id] }
            );
            const playerIds = links.map(l => l.playerUserID);
            if (playerIds.length === 0) {
                return res.json({ totalPaid: 0, totalPending: 0, totalOverdue: 0, totalFees: 0 });
            }
            where.playerUserID = { [Op.in]: playerIds };
        } else if (req.user.role === 'player') {
            where.playerUserID = req.user.id;
        } else if (req.user.role !== 'coach' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const fees = await Fee.findAll({ where });
        const totalPaid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + parseFloat(f.amountDue), 0);
        const totalPending = fees.filter(f => f.status === 'pending').reduce((s, f) => s + parseFloat(f.amountDue), 0);
        const totalOverdue = fees.filter(f => f.status === 'overdue').reduce((s, f) => s + parseFloat(f.amountDue), 0);

        res.json({ totalPaid, totalPending, totalOverdue, totalFees: fees.length });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── POST /api/payments/pay-online  (parent — simulated payment) ──────────────
router.post('/pay-online', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can pay online' });
        }

        const { feeID, paymentMethod, cardDetails } = req.body;
        if (!feeID) {
            return res.status(400).json({ message: 'feeID is required' });
        }

        // Validate the fee exists and belongs to one of this parent's children
        const sequelize = require('../config/database');
        const [links] = await sequelize.query(
            'SELECT playerUserID FROM parentplayerlink WHERE parentUserID = ?',
            { replacements: [req.user.id] }
        );
        const playerIds = links.map(l => l.playerUserID);

        const fee = await Fee.findOne({
            where: { feeID, playerUserID: { [Op.in]: playerIds } },
            include: [{ model: User, as: 'player', attributes: ['id', 'name', 'email'] }]
        });

        if (!fee) {
            return res.status(404).json({ message: 'Fee not found or not authorized' });
        }
        if (fee.status === 'paid') {
            return res.status(400).json({ message: 'This fee has already been paid' });
        }

        // Simulate a 2-second processing delay (replace with real gateway in production)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate a simulated transaction ID
        const transactionRef = 'SIM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Update fee status
        await fee.update({ status: 'paid' });

        // Create payment record
        const paymentRecord = await Payment.create({
            feeID: fee.feeID,
            paidBy: req.user.id,
            amountPaid: fee.amountDue,
            paymentDate: new Date(),
            paymentMethod: paymentMethod || 'online',
            gatewayTransactionID: transactionRef,
            status: 'completed'
        });

        // Log notification
        await Notification.create({
            userID: req.user.id,
            content: `Payment of LKR ${fee.amountDue} paid for ${fee.player?.name} (${fee.month}/${fee.year}) via ${paymentMethod || 'online'}`,
            channel: 'system',
            status: 'sent',
            sentAt: new Date(),
            triggeringEntityType: 'payment',
            triggeringEntityID: paymentRecord.paymentID
        });

        // Send confirmation email
        try {
            const parent = await User.findByPk(req.user.id);
            await sendPaymentConfirmationEmail(
                parent.email,
                parent.name,
                fee.player?.name,
                fee.amountDue,
                paymentMethod || 'online',
                transactionRef
            );
        } catch (emailErr) {
            console.error('Confirmation email error:', emailErr);
        }

        res.json({
            message: 'Payment successful!',
            transaction: {
                paymentID: paymentRecord.paymentID,
                transactionRef,
                amountPaid: parseFloat(fee.amountDue),
                playerName: fee.player?.name,
                month: fee.month,
                year: fee.year,
                method: paymentMethod || 'online'
            }
        });
    } catch (error) {
        console.error('Pay online error:', error);
        res.status(500).json({ message: 'Payment processing failed' });
    }
});

// ─── POST /api/payments/mark-physical  (coach) ───────────────────────────────
router.post('/mark-physical', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'coach' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { feeID, amount, note } = req.body;
        if (!feeID) {
            return res.status(400).json({ message: 'feeID is required' });
        }

        const fee = await Fee.findOne({
            where: { feeID },
            include: [{ model: User, as: 'player', attributes: ['id', 'name', 'email'] }]
        });

        if (!fee) {
            return res.status(404).json({ message: 'Fee not found' });
        }
        if (fee.status === 'paid') {
            return res.status(400).json({ message: 'This fee has already been paid' });
        }

        // Use coach-entered amount if provided, otherwise use fee's amountDue
        const amountPaid = (amount && parseFloat(amount) > 0) ? parseFloat(amount) : parseFloat(fee.amountDue);

        // Update fee status
        await fee.update({ status: 'paid' });

        // Create payment record
        const transactionRef = 'PHY-' + Date.now();
        const paymentRecord = await Payment.create({
            feeID: fee.feeID,
            paidBy: fee.playerUserID,
            amountPaid,
            paymentDate: new Date(),
            paymentMethod: 'physical',
            gatewayTransactionID: transactionRef,
            status: 'completed'
        });

        // Log in notification table
        await Notification.create({
            userID: fee.playerUserID,
            content: `Cash payment of LKR ${amountPaid.toLocaleString()} recorded by coach for ${fee.player?.name} (${fee.month}/${fee.year})${note ? '. Note: ' + note : ''}`,
            channel: 'system',
            status: 'sent',
            sentAt: new Date(),
            triggeringEntityType: 'payment',
            triggeringEntityID: paymentRecord.paymentID
        });

        // Log in audit log
        await AuditLog.create({
            userID: req.user.id,
            action: 'PAYMENT_MARKED_PHYSICAL',
            entity: 'Payment',
            entityID: paymentRecord.paymentID,
            timestamp: new Date()
        });

        // Send confirmation email to player's parents
        try {
            const parentIds = await getParentForPlayer(fee.playerUserID);
            for (const parentId of parentIds) {
                const parent = await User.findByPk(parentId);
                if (parent) {
                    await sendPaymentConfirmationEmail(
                        parent.email,
                        parent.name,
                        fee.player?.name,
                        amountPaid,
                        'Cash (Physical)',
                        transactionRef
                    );
                }
            }
        } catch (emailErr) {
            console.error('Confirmation email error:', emailErr);
        }

        res.json({
            message: `Payment of LKR ${amountPaid.toLocaleString()} recorded for ${fee.player?.name}`,
            fee: { feeID: fee.feeID, status: 'paid', playerName: fee.player?.name, amountPaid }
        });
    } catch (error) {
        console.error('Mark physical error:', error);
        res.status(500).json({ message: 'Server error while marking payment' });
    }
});

// ─── GET /api/payments/history  (all roles — scoped) ─────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
    try {
        let feeWhere = {};

        if (req.user.role === 'parent') {
            const sequelize = require('../config/database');
            const [links] = await sequelize.query(
                'SELECT playerUserID FROM parentplayerlink WHERE parentUserID = ?',
                { replacements: [req.user.id] }
            );
            const playerIds = links.map(l => l.playerUserID);
            if (playerIds.length === 0) return res.json({ history: [] });
            feeWhere.playerUserID = { [Op.in]: playerIds };
        } else if (req.user.role === 'player') {
            feeWhere.playerUserID = req.user.id;
        } else if (req.user.role !== 'coach' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const payments = await Payment.findAll({
            include: [
                {
                    model: Fee,
                    as: 'fee',
                    where: Object.keys(feeWhere).length ? feeWhere : undefined,
                    include: [{ model: User, as: 'player', attributes: ['id', 'name', 'email'] }]
                },
                { model: User, as: 'payer', attributes: ['id', 'name', 'role'] }
            ],
            order: [['paymentDate', 'DESC'], ['paymentID', 'DESC']]
        });

        const history = payments.map(p => ({
            paymentID: p.paymentID,
            transactionRef: p.gatewayTransactionID,
            amountPaid: parseFloat(p.amountPaid),
            paymentDate: p.paymentDate,
            paymentMethod: p.paymentMethod,
            status: p.status,
            feeID: p.feeID,
            month: p.fee?.month,
            year: p.fee?.year,
            playerName: p.fee?.player?.name || 'Unknown',
            playerEmail: p.fee?.player?.email || '',
            playerID: p.fee?.player?.id,
            paidByName: p.payer?.name || 'System',
            paidByRole: p.payer?.role || 'unknown',
            isOnline: p.paymentMethod !== 'physical' && p.paymentMethod !== 'cash',
        }));

        res.json({ history });
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ message: 'Server error while fetching history' });
    }
});

// ─── POST /api/payments/generate-fees  (coach/admin — manual trigger) ─────────
router.post('/generate-fees', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'coach' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const result = await generateMonthlyFees();
        res.json({
            message: `Fee generation complete for ${result.month}/${result.year}`,
            created: result.created,
            skipped: result.skipped
        });
    } catch (error) {
        console.error('Generate fees error:', error);
        res.status(500).json({ message: 'Server error while generating fees' });
    }
});

module.exports = router;
module.exports.generateMonthlyFees = generateMonthlyFees;
module.exports.getParentForPlayer = getParentForPlayer;
module.exports.getApprovingCoach = getApprovingCoach;
