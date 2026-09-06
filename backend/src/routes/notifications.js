const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, notificationController.getNotifications);
router.put('/read-all', auth, notificationController.markAllAsRead);  // must be before /:id/read
router.put('/:id/read', auth, notificationController.markAsRead);
router.post('/create', auth, notificationController.createNotification);
router.post('/seed', auth, notificationController.seedReminders);

module.exports = router;
