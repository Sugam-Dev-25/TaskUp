const notificationRepository =
    require('./notification.repository');

class NotificationService {

    async createNotification(data) {

        if (!data.user_id) {
            throw new Error('user_id is required');
        }

        if (!data.title) {
            throw new Error('title is required');
        }

        if (!data.message) {
            throw new Error('message is required');
        }

        return notificationRepository.create(data);
    }


    async getByUser(userId, limit, offset) {

        return notificationRepository.findByUser(
            userId,
            limit,
            offset
        );
    }


    async getUnread(userId) {

        return notificationRepository.getUnread(
            userId
        );
    }


    async getUnreadCount(userId) {

        return notificationRepository.getUnreadCount(
            userId
        );
    }


    async markAsRead(id, userId) {

        const updated =
            await notificationRepository.markAsRead(
                id,
                userId
            );

        if (!updated) {
            throw new Error(
                'Notification not found'
            );
        }

        return true;
    }


    async markAllAsRead(userId) {

        return notificationRepository.markAllAsRead(
            userId
        );
    }
}

module.exports = new NotificationService();
