const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, Fee, AuditLog, Message, Notification } = require('../models');
const {
    sendPaymentReminderEmail,
    sendPaymentOverdueEmail
} = require('./emailService');

// Round LKR amount to 2 decimal places
const fmt = (n) => parseFloat(parseFloat(n).toFixed(2));

// ─── Helper: get linked parents for a player ──────────────────────────────────
async function getParentsForPlayer(playerUserId) {
    const sequelize = require('../config/database');
    const [rows] = await sequelize.query(
        'SELECT parentUserID FROM parentplayerlink WHERE playerUserID = ?',
        { replacements: [playerUserId] }
    );
    return rows.map(r => r.parentUserID);
}

// ─── Helper: get the coach who approved a parent ──────────────────────────────
async function getApprovingCoach(parentUserId) {
    const log = await AuditLog.findOne({
        where: { action: 'PARENT_APPROVED_BY_COACH', entityID: parentUserId },
        order: [['timestamp', 'DESC']]
    });
    return log ? log.userID : null;
}

// ─── Helper: send overdue chat message from approving coach to parent ─────────
async function sendOverdueChatMessage(parentUserId, playerName, amount, month, year) {
    const coachId = await getApprovingCoach(parentUserId);
    if (!coachId) {
        console.log(`[Scheduler] No approving coach found for parent ${parentUserId}, skipping chat message`);
        return;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month - 1] || month;

    const content = `⚠️ Payment Overdue Reminder: The monthly academy fee of LKR ${fmt(amount).toLocaleString()} for ${playerName} (${monthName} ${year}) is now overdue. Please make the payment as soon as possible. Contact us if you need assistance.`;

    await Message.create({
        senderID: coachId,
        receiverID: parentUserId,
        content,
        isRead: false,
        sentAt: new Date()
    });

    // Also log in notification table
    await Notification.create({
        userID: parentUserId,
        content,
        channel: 'chat',
        status: 'sent',
        sentAt: new Date(),
        triggeringEntityType: 'fee_overdue',
        triggeringEntityID: null
    });

    console.log(`[Scheduler] Overdue chat message sent from coach ${coachId} to parent ${parentUserId} for player ${playerName}`);
}

// ─── JOB 1: 1st of every month at 00:01 — Generate monthly fees ───────────────
function scheduleMonthlyFeeGeneration() {
    cron.schedule('1 0 1 * *', async () => {
        console.log('[Scheduler] Running monthly fee generation...');
        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const dueDate = new Date(year, month - 1, 14);
            const feeAmount = parseFloat(process.env.MONTHLY_FEE_AMOUNT) || 3000;

            const players = await User.findAll({
                where: { role: 'player', accountStatus: 'active' }
            });

            let created = 0;
            for (const player of players) {
                const existing = await Fee.findOne({
                    where: { playerUserID: player.id, month, year }
                });
                if (existing) continue;
                await Fee.create({
                    playerUserID: player.id,
                    month, year,
                    amountDue: feeAmount,
                    dueDate,
                    status: 'pending'
                });
                created++;
            }
            console.log(`[Scheduler] Fee generation done: ${created} fees created for ${month}/${year}`);
        } catch (err) {
            console.error('[Scheduler] Fee generation error:', err);
        }
    }, { timezone: 'Asia/Colombo' });

    console.log('[Scheduler] Monthly fee generation job scheduled (1st of every month)');
}

// ─── JOB 2: 7th of every month at 09:00 — Send reminder emails ────────────────
function scheduleReminderEmails() {
    cron.schedule('0 9 7 * *', async () => {
        console.log('[Scheduler] Running payment reminder emails...');
        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            const pendingFees = await Fee.findAll({
                where: { month, year, status: 'pending' },
                include: [{ model: User, as: 'player', attributes: ['id', 'name', 'email'] }]
            });

            console.log(`[Scheduler] Sending reminders for ${pendingFees.length} pending fees`);

            for (const fee of pendingFees) {
                const player = fee.player;
                if (!player) continue;

                // Email the player
                try {
                    await sendPaymentReminderEmail(
                        player.email, player.name, player.name,
                        fmt(fee.amountDue), fee.dueDate
                    );
                } catch (e) {
                    console.error(`[Scheduler] Player reminder email error for ${player.email}:`, e.message);
                }

                // Email the parent(s)
                const parentIds = await getParentsForPlayer(player.id);
                for (const parentId of parentIds) {
                    const parent = await User.findByPk(parentId);
                    if (!parent) continue;
                    try {
                        await sendPaymentReminderEmail(
                            parent.email, parent.name, player.name,
                            fmt(fee.amountDue), fee.dueDate
                        );
                    } catch (e) {
                        console.error(`[Scheduler] Parent reminder email error for ${parent.email}:`, e.message);
                    }
                }
            }

            console.log('[Scheduler] Reminder emails done.');
        } catch (err) {
            console.error('[Scheduler] Reminder email error:', err);
        }
    }, { timezone: 'Asia/Colombo' });

    console.log('[Scheduler] Payment reminder job scheduled (7th of every month at 09:00 IST)');
}

// ─── JOB 3: 15th of every month at 00:01 — Mark overdue + send notices ────────
function scheduleOverdueProcessing() {
    cron.schedule('1 0 15 * *', async () => {
        console.log('[Scheduler] Running overdue fee processing...');
        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            // Mark all pending fees for this month as overdue
            const [updatedCount] = await Fee.update(
                { status: 'overdue' },
                { where: { month, year, status: 'pending' } }
            );

            console.log(`[Scheduler] Marked ${updatedCount} fees as overdue for ${month}/${year}`);

            // Fetch all overdue fees this month to send notifications
            const overdueFees = await Fee.findAll({
                where: { month, year, status: 'overdue' },
                include: [{ model: User, as: 'player', attributes: ['id', 'name', 'email'] }]
            });

            for (const fee of overdueFees) {
                const player = fee.player;
                if (!player) continue;

                // Email the player
                try {
                    await sendPaymentOverdueEmail(
                        player.email, player.name, player.name, fmt(fee.amountDue)
                    );
                } catch (e) {
                    console.error(`[Scheduler] Player overdue email error for ${player.email}:`, e.message);
                }

                // Email the parent(s) + send chat message from approving coach
                const parentIds = await getParentsForPlayer(player.id);
                for (const parentId of parentIds) {
                    const parent = await User.findByPk(parentId);
                    if (!parent) continue;

                    // Overdue email
                    try {
                        await sendPaymentOverdueEmail(
                            parent.email, parent.name, player.name, fmt(fee.amountDue)
                        );
                    } catch (e) {
                        console.error(`[Scheduler] Parent overdue email error for ${parent.email}:`, e.message);
                    }

                    // Chat message from the approving coach
                    try {
                        await sendOverdueChatMessage(parentId, player.name, fee.amountDue, month, year);
                    } catch (e) {
                        console.error(`[Scheduler] Chat message error for parent ${parentId}:`, e.message);
                    }
                }
            }

            console.log('[Scheduler] Overdue processing done.');
        } catch (err) {
            console.error('[Scheduler] Overdue processing error:', err);
        }
    }, { timezone: 'Asia/Colombo' });

    console.log('[Scheduler] Overdue fee job scheduled (15th of every month at 00:01 IST)');
}

// ─── Start all scheduled jobs ──────────────────────────────────────────────────
function startPaymentScheduler() {
    scheduleMonthlyFeeGeneration();
    scheduleReminderEmails();
    scheduleOverdueProcessing();
    console.log('[Scheduler] All payment scheduler jobs started ✅');
}

module.exports = { startPaymentScheduler };
