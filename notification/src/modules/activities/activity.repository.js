const db = require('../../config/database');

class ActivityRepository {

    async create(data) {
        const {
            user_id,
            user_name,
            entity_type,
            entity_id,
            action,
            old_data,
            new_data,
            metadata
        } = data;

        const [result] = await db.execute(
            `
            INSERT INTO activity_logs
            (
                user_id,
                user_name,
                entity_type,
                entity_id,
                action,
                old_data,
                new_data,
                metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                user_id || null,
                user_name || null,
                entity_type,
                entity_id,
                action,
                old_data ? JSON.stringify(old_data) : null,
                new_data ? JSON.stringify(new_data) : null,
                metadata ? JSON.stringify(metadata) : null
            ]
        );

        return this.findById(result.insertId);
    }


    async findById(id) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM activity_logs
            WHERE id = ?
            `,
            [id]
        );

        return rows[0] || null;
    }


    async findByEntity(entityType, entityId, limit = 50, offset = 0) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM activity_logs
            WHERE entity_type = ?
            AND entity_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [
                entityType,
                entityId,
                Number(limit),
                Number(offset)
            ]
        );

        return rows;
    }


    async findByUser(userId, limit = 50, offset = 0) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM activity_logs
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


    async findAll(limit = 50, offset = 0) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM activity_logs
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [
                Number(limit),
                Number(offset)
            ]
        );

        return rows;
    }
}

module.exports = new ActivityRepository();
