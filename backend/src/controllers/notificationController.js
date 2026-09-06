const firestoreService = require('../services/firestoreService');
const smsService = require('../services/smsService');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await firestoreService.getNotificationsByUser(req.user.id);
        const unreadCount = notifications.filter(n => !n.read).length;
        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('[NOTIFICATIONS] Fetch failed:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await firestoreService.markNotificationAsRead(id, req.user.id);
        if (!updated) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ message: 'Marked as read', notification: updated });
    } catch (err) {
        console.error('[NOTIFICATIONS] Mark read failed:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const result = await firestoreService.markAllNotificationsAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read', result });
    } catch (err) {
        console.error('[NOTIFICATIONS] Mark all read failed:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, link, send_sms, phone } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const notification = await firestoreService.createNotification({
            user_id: req.user.id,
            title,
            message,
            type: type || 'info',
            link: link || null
        });

        // Optional stretch: SMS reminder via Twilio
        if (send_sms && (phone || req.user.phone)) {
            try {
                const targetPhone = phone || req.user.phone;
                if (smsService.sendSMS) {
                    await smsService.sendSMS(targetPhone, `${title}: ${message}`);
                }
            } catch (smsErr) {
                console.warn('[SMS] Reminder SMS failed, continuing with in-app notification:', smsErr.message);
            }
        }

        res.status(201).json({ message: 'Notification created', notification });
    } catch (err) {
        console.error('[NOTIFICATIONS] Creation failed:', err);
        res.status(500).json({ error: err.message });
    }
};

// Seed demo reminders for testing
exports.seedReminders = async (req, res) => {
    try {
        const demoReminders = [
            {
                user_id: req.user.id,
                title: 'OPD Queue Reminder',
                message: 'Your OPD queue number #12 is coming up in 2 turns. Please proceed to Room 104.',
                type: 'opd',
                link: '/status'
            },
            {
                user_id: req.user.id,
                title: 'New Prescription Issued',
                message: 'Dr. Jane Watson has issued you a prescription for Amoxicillin and Paracetamol.',
                type: 'prescription',
                link: '/records'
            },
            {
                user_id: req.user.id,
                title: 'Upcoming Appointment Tomorrow',
                message: 'Your scheduled Follow-up with Dr. Gregory House is tomorrow at 10:30 AM.',
                type: 'appointment',
                link: '/status'
            }
        ];

        const created = [];
        for (const item of demoReminders) {
            const notif = await firestoreService.createNotification(item);
            created.push(notif);
        }

        res.status(201).json({ message: 'Demo reminders seeded successfully', reminders: created });
    } catch (err) {
        console.error('[NOTIFICATIONS] Seed failed:', err);
        res.status(500).json({ error: err.message });
    }
};
