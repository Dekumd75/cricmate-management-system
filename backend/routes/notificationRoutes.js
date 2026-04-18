const express = require('express');
const { User, Notification, NotificationTemplate } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sendBroadcastEmail } = require('../services/emailService');

const router = express.Router();

// ─── Middleware: allow admin OR coach ─────────────────────────────────────────
function requireAdminOrCoach(req, res, next) {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
        return res.status(403).json({ message: 'Access denied. Admin or Coach only.' });
    }
    next();
}

// ─── GET /api/notifications/templates ─────────────────────────────────────────
// List all notification templates
router.get('/templates', authMiddleware, requireAdminOrCoach, async (req, res) => {
    try {
        const templates = await NotificationTemplate.findAll({
            order: [['templateID', 'DESC']]
        });
        res.json({ templates });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ message: 'Server error while fetching templates' });
    }
});

// ─── POST /api/notifications/templates ────────────────────────────────────────
// Create a new notification template
router.post('/templates', authMiddleware, requireAdminOrCoach, async (req, res) => {
    try {
        const { templateName, subject, body, channel } = req.body;
        if (!templateName || !body) {
            return res.status(400).json({ message: 'templateName and body are required' });
        }
        const template = await NotificationTemplate.create({
            templateName,
            subject: subject || '',
            body,
            channel: channel || 'system'
        });
        res.status(201).json({ message: 'Template created successfully', template });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ message: 'Server error while creating template' });
    }
});

// ─── PUT /api/notifications/templates/:id ─────────────────────────────────────
// Edit an existing template
router.put('/templates/:id', authMiddleware, requireAdminOrCoach, async (req, res) => {
    try {
        const template = await NotificationTemplate.findByPk(req.params.id);
        if (!template) return res.status(404).json({ message: 'Template not found' });
        const { templateName, subject, body, channel } = req.body;
        await template.update({ templateName, subject, body, channel });
        res.json({ message: 'Template updated', template });
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ message: 'Server error while updating template' });
    }
});

// ─── DELETE /api/notifications/templates/:id ──────────────────────────────────
// Delete a template
router.delete('/templates/:id', authMiddleware, requireAdminOrCoach, async (req, res) => {
    try {
        const template = await NotificationTemplate.findByPk(req.params.id);
        if (!template) return res.status(404).json({ message: 'Template not found' });
        await template.destroy();
        res.json({ message: 'Template deleted' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ message: 'Server error while deleting template' });
    }
});

// ─── POST /api/notifications/send ─────────────────────────────────────────────
// Broadcast with multi-channel support
// Body: { templateID?, targetRoles[], customMessage?, channels: ['system','email'], subject? }
router.post('/send', authMiddleware, requireAdminOrCoach, async (req, res) => {
    try {
        const { templateID, targetRoles, customMessage, channels, subject } = req.body;

        if (!templateID && !customMessage) {
            return res.status(400).json({ message: 'templateID or customMessage is required' });
        }
        if (!targetRoles || targetRoles.length === 0) {
            return res.status(400).json({ message: 'At least one target role is required' });
        }

        // Default to system only; accept array of channels
        const selectedChannels = Array.isArray(channels) && channels.length > 0
            ? channels : ['system'];

        // Load template if provided
        let template = null;
        if (templateID) {
            template = await NotificationTemplate.findByPk(templateID);
            if (!template) return res.status(404).json({ message: 'Template not found' });
        }

        // Fetch all target users
        const users = await User.findAll({
            where: { role: targetRoles, accountStatus: 'active' },
            attributes: ['id', 'name', 'email', 'role']
        });

        if (users.length === 0) {
            return res.status(404).json({ message: 'No active users found for the selected roles' });
        }

        const content      = customMessage || template.body;
        const emailSubject = subject || template?.subject || 'New Notification from CricMate';
        const channelStr   = selectedChannels.join(','); // store comma-separated

        // Get sender info for email
        const sender = await User.findByPk(req.user.id, { attributes: ['name', 'role'] });

        let emailCount = 0;
        let emailFailed = 0;

        for (const user of users) {
            // Always record in notification table
            await Notification.create({
                userID: user.id,
                templateID: templateID || null,
                content,
                channel: channelStr,
                status: 'sent',
                sentAt: new Date(),
                triggeringEntityType: 'broadcast',
                triggeringEntityID: req.user.id
            });

            // Also send real email if 'email' channel is included
            if (selectedChannels.includes('email')) {
                const result = await sendBroadcastEmail(
                    user.email,
                    user.name,
                    emailSubject,
                    content,
                    sender?.name || 'CricMate',
                    sender?.role || req.user.role
                );
                if (result.success) emailCount++;
                else emailFailed++;
            }
        }

        res.json({
            message: `Notification sent to ${users.length} user(s) via [${selectedChannels.join(', ')}]`,
            sentCount: users.length,
            emailsSent: emailCount,
            emailsFailed: emailFailed,
            channels: selectedChannels,
            targetUsers: users.map(u => ({ id: u.id, name: u.name, role: u.role }))
        });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ message: 'Server error while sending notification' });
    }
});

// ─── GET /api/notifications/my ────────────────────────────────────────────────
// Get notifications for the logged-in user (all roles)
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { userID: req.user.id },
            order: [['sentAt', 'DESC']],
            limit: 50
        });
        res.json({ notifications });
    } catch (error) {
        console.error('Get my notifications error:', error);
        res.status(500).json({ message: 'Server error while fetching notifications' });
    }
});

// ─── GET /api/notifications/sent-log ──────────────────────────────────────────
// Admin/Coach: view all broadcast notifications sent
router.get('/sent-log', authMiddleware, requireAdminOrCoach, async (req, res) => {
    try {
        const logs = await Notification.findAll({
            where: { triggeringEntityType: 'broadcast' },
            include: [{ model: User, as: 'recipient', attributes: ['id', 'name', 'role'] }],
            order: [['sentAt', 'DESC']],
            limit: 100
        });
        res.json({ logs });
    } catch (error) {
        console.error('Sent log error:', error);
        res.status(500).json({ message: 'Server error while fetching sent log' });
    }
});

module.exports = router;
