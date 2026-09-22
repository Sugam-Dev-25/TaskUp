const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const notificationController = require('./notification.controller');

// Left unauthenticated deliberately — this is how board-service creates
// notifications for people (service-to-service call, not a browser call).
router.post('/', notificationController.create);

router.get('/', protect, notificationController.getByUser);
router.get('/unread', protect, notificationController.getUnread);
router.get('/unread/count', protect, notificationController.getUnreadCount);
router.patch('/:id/read', protect, notificationController.markAsRead);
router.patch('/read-all', protect, notificationController.markAllAsRead);

module.exports = router;