const notificationService =
    require('./notification.service');

class NotificationController {

    async create(req, res) {

        try {

            const notification =
                await notificationService.createNotification(
                    req.body
                );

            return res.status(201).json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });

        } catch (error) {

            console.error(
                'Create Notification Error:',
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }


    async getByUser(req, res) {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const notifications = await notificationService.getByUser(req.user._id, limit, offset);
        return res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async getUnread(req, res) {
    try {
        const notifications = await notificationService.getUnread(req.user._id);
        return res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async getUnreadCount(req, res) {
    try {
        const count = await notificationService.getUnreadCount(req.user._id);
        return res.status(200).json({ success: true, count });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async markAsRead(req, res) {
    try {
        // id still comes from the URL (which notification) — userId now
        // comes from the verified token (whose notification), not a URL param.
        await notificationService.markAsRead(req.params.id, req.user._id);
        return res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        return res.status(404).json({ success: false, message: error.message });
    }
}

async markAllAsRead(req, res) {
    try {
        const count = await notificationService.markAllAsRead(req.user._id);
        return res.status(200).json({ success: true, message: 'All notifications marked as read', updated: count });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
}

module.exports = new NotificationController();
