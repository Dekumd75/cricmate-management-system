const express = require('express');
const { Op } = require('sequelize');
const { User, Message, PlayerProfile } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Helper: check if two users are a valid coach↔parent pair ─────────────────
async function isValidPair(userA, userB) {
    const roles = new Set([userA.role, userB.role]);
    return roles.has('coach') && roles.has('parent');
}

// ─── GET /api/messages/contacts ──────────────────────────────────────────────
// Coach → returns all active parents (with their linked player name if available)
// Parent → returns all active coaches
router.get('/contacts', authMiddleware, async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== 'coach' && role !== 'parent') {
            return res.status(403).json({ message: 'Only coaches and parents can access messages' });
        }

        const targetRole = role === 'coach' ? 'parent' : 'coach';

        const contacts = await User.findAll({
            where: { role: targetRole, accountStatus: 'active' },
            attributes: ['id', 'name', 'email'],
            include: role === 'coach' ? [{
                model: PlayerProfile,
                // Parents don't have playerProfile directly, but show name
                required: false,
                as: 'playerProfile'
            }] : []
        });

        const formatted = contacts.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            role: targetRole
        }));

        res.json({ contacts: formatted });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ message: 'Server error while fetching contacts' });
    }
});

// ─── GET /api/messages/conversations ─────────────────────────────────────────
// Returns a list of unique people the current user has exchanged messages with,
// including the last message and unread count per thread.
router.get('/conversations', authMiddleware, async (req, res) => {
    try {
        const myId = req.user.id;

        // Get all messages involving me
        const allMessages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderID: myId },
                    { receiverID: myId }
                ]
            },
            include: [
                { model: User, as: 'sender', attributes: ['id', 'name', 'role'] },
                { model: User, as: 'receiver', attributes: ['id', 'name', 'role'] }
            ],
            order: [['sentAt', 'DESC']]
        });

        // Build unique thread map: keyed by the OTHER user's ID
        const threadMap = new Map();
        for (const msg of allMessages) {
            const otherId = msg.senderID === myId ? msg.receiverID : msg.senderID;
            const otherUser = msg.senderID === myId ? msg.receiver : msg.sender;

            if (!threadMap.has(otherId)) {
                threadMap.set(otherId, {
                    contactId: otherId,
                    contactName: otherUser?.name || 'Unknown',
                    contactRole: otherUser?.role || 'unknown',
                    lastMessage: msg.content,
                    lastMessageAt: msg.sentAt,
                    unreadCount: 0
                });
            }

            // Count unread messages FROM the other person TO me
            if (msg.receiverID === myId && !msg.isRead) {
                const thread = threadMap.get(otherId);
                thread.unreadCount++;
            }
        }

        const conversations = Array.from(threadMap.values())
            .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

        res.json({ conversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ message: 'Server error while fetching conversations' });
    }
});

// ─── GET /api/messages/thread/:otherUserId ────────────────────────────────────
// Get all messages exchanged between the current user and another user
router.get('/thread/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const myId = req.user.id;
        const otherId = parseInt(req.params.otherUserId);

        if (isNaN(otherId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        // Fetch the other user to verify they exist
        const otherUser = await User.findByPk(otherId, { attributes: ['id', 'name', 'role'] });
        if (!otherUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate it's a coach↔parent pair
        const valid = await isValidPair(req.user, otherUser);
        if (!valid) {
            return res.status(403).json({ message: 'Messages are only allowed between coaches and parents' });
        }

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderID: myId, receiverID: otherId },
                    { senderID: otherId, receiverID: myId }
                ]
            },
            order: [['sentAt', 'ASC']],
            attributes: ['messageID', 'senderID', 'receiverID', 'content', 'isRead', 'sentAt']
        });

        res.json({
            messages: messages.map(m => ({
                id: m.messageID,
                senderId: m.senderID,
                receiverId: m.receiverID,
                content: m.content,
                isRead: m.isRead,
                sentAt: m.sentAt,
                isMine: m.senderID === myId
            })),
            contact: { id: otherUser.id, name: otherUser.name, role: otherUser.role }
        });
    } catch (error) {
        console.error('Get thread error:', error);
        res.status(500).json({ message: 'Server error while fetching messages' });
    }
});

// ─── POST /api/messages/send ──────────────────────────────────────────────────
// Send a message { receiverId, content }
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;

        if (!receiverId || !content || !content.trim()) {
            return res.status(400).json({ message: 'receiverId and content are required' });
        }

        if (parseInt(receiverId) === senderId) {
            return res.status(400).json({ message: 'You cannot message yourself' });
        }

        const receiver = await User.findByPk(receiverId, { attributes: ['id', 'name', 'role', 'accountStatus'] });
        if (!receiver) {
            return res.status(404).json({ message: 'Receiver not found' });
        }

        // Validate coach↔parent pair
        const valid = await isValidPair(req.user, receiver);
        if (!valid) {
            return res.status(403).json({ message: 'Messages are only allowed between coaches and parents' });
        }

        const message = await Message.create({
            senderID: senderId,
            receiverID: parseInt(receiverId),
            content: content.trim(),
            isRead: false,
            sentAt: new Date()
        });

        res.status(201).json({
            message: {
                id: message.messageID,
                senderId: message.senderID,
                receiverId: message.receiverID,
                content: message.content,
                isRead: message.isRead,
                sentAt: message.sentAt,
                isMine: true
            }
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error while sending message' });
    }
});

// ─── PUT /api/messages/read/:otherUserId ──────────────────────────────────────
// Mark all messages from otherUser → current user as read
router.put('/read/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const myId = req.user.id;
        const otherId = parseInt(req.params.otherUserId);

        if (isNaN(otherId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        await Message.update(
            { isRead: true },
            {
                where: {
                    senderID: otherId,
                    receiverID: myId,
                    isRead: false
                }
            }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ message: 'Server error while marking messages as read' });
    }
});

module.exports = router;
