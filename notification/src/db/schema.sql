CREATE DATABASE IF NOT EXISTS notification_db;

USE notification_db;

-- ============================================
-- ACTIVITY LOGS
-- ============================================

CREATE TABLE activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id VARCHAR(100) NULL,
    user_name VARCHAR(255) NULL,

    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,

    action VARCHAR(100) NOT NULL,

    old_data JSON NULL,
    new_data JSON NULL,

    metadata JSON NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_entity_created (entity_type, entity_id, created_at)
);


-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    activity_id BIGINT UNSIGNED NULL,

    user_id VARCHAR(100) NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    read_at TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_notification_user (user_id),
    INDEX idx_notification_read (user_id, is_read),
    INDEX idx_notification_created (user_id, created_at),

    CONSTRAINT fk_notification_activity
        FOREIGN KEY (activity_id)
        REFERENCES activity_logs(id)
        ON DELETE SET NULL
);
