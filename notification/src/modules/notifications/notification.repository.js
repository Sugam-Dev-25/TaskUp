const db = require('../../config/database');

class NotificationRepository {

    async create(data) {

        const {
            activity_id,
            user_id,
            title,
            message
        } = data;

        const [result] = await db.execute(
            `
            INSERT INTO notifications
            (
                activity_id,
                user_id,
                title,
                message
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                activity_id || null,
                user_id,
                title,
                message
            ]
        );

        return this.findById(result.insertId);
    }


    async findById(id) {

        const [rows] = await db.execute(
            `
            SELECT *
            FROM notifications
            WHERE id = ?
            `,
            [id]
        );

        return rows[0] || null;
    }


    async findByUser(userId, limit = 50, offset = 0) {

        const [rows] = await db.execute(
            `
            SELECT *
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [
                userId,
                Number(limit),
                Number(offset)
            ]
        );

        return rows;
    }


    async getUnread(userId) {

        const [rows] = await db.execute(
            `
            SELECT *
            FROM notifications
            WHERE user_id = ?
            AND is_read = FALSE
            ORDER BY created_at DESC
            `,
            [userId]
        );

        return rows;
    }


    async getUnreadCount(userId) {

        const [rows] = await db.execute(
            `
            SELECT COUNT(*) AS count
            FROM notifications
            WHERE user_id = ?
            AND is_read = FALSE
            `,
            [userId]
        );

        return rows[0].count;
    }


    async markAsRead(id, userId) {

        const [result] = await db.execute(
            `
            UPDATE notifications
            SET
                is_read = TRUE,
                read_at = CURRENT_TIMESTAMP
            WHERE id = ?
            AND user_id = ?
            `,
            [id, userId]
        );

        return result.affectedRows > 0;
    }


    async markAllAsRead(userId) {

        const [result] = await db.execute(
            `
            UPDATE notifications
            SET
                is_read = TRUE,
                read_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            AND is_read = FALSE
            `,
            [userId]
        );

        return result.affectedRows;
    }
}

module.exports = new NotificationRepository();
