CREATE DATABASE IF NOT EXISTS board_db;

USE board_db;

-- ============================================
-- BOARDS
-- ============================================

CREATE TABLE boards (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,

    -- owner/members used to be ObjectId refs into a local User collection.
    -- Users now live in the user-service (its own users table), so these
    -- are just the user-service's id (a UUID string), not a foreign key.
    owner VARCHAR(100) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_boards_owner (owner)
);

-- Board.members array -> junction table
CREATE TABLE board_members (
    board_id CHAR(36) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (board_id, user_id),
    CONSTRAINT fk_board_members_board
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,

    INDEX idx_board_members_user (user_id)
);

-- ============================================
-- COLUMNS
-- ============================================

CREATE TABLE columns (
    id CHAR(36) PRIMARY KEY,
    board_id CHAR(36) NOT NULL,
    name ENUM('Todo', 'In Progress', 'Delay', 'Completed') NOT NULL,
    order_index INT NULL,

    CONSTRAINT fk_columns_board
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,

    INDEX idx_columns_board (board_id)
);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE tasks (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    progress INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0,
    priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    due_date DATETIME NULL,
    start_date DATETIME NULL,

    column_id CHAR(36) NOT NULL,
    board_id CHAR(36) NOT NULL,

    -- flattened from the old nested `timeManagement` sub-document
    estimated_time INT NOT NULL DEFAULT 0,         -- hours
    total_logged_time BIGINT NOT NULL DEFAULT 0,   -- ms
    time_delay BIGINT NOT NULL DEFAULT 0,          -- ms
    active_start_time DATETIME NULL,
    is_running BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tasks_column
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_board
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,

    INDEX idx_tasks_column (column_id),
    INDEX idx_tasks_board (board_id)
);

-- Task.assignedTo array -> junction table
CREATE TABLE task_assignees (
    task_id CHAR(36) NOT NULL,
    user_id VARCHAR(100) NOT NULL,

    PRIMARY KEY (task_id, user_id),
    CONSTRAINT fk_task_assignees_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_task_assignees_user (user_id)
);

-- Task.comments array
CREATE TABLE task_comments (
    id CHAR(36) PRIMARY KEY,
    task_id CHAR(36) NOT NULL,
    user_id VARCHAR(100) NULL,
    text TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_comments_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_task_comments_task (task_id)
);

-- comment.attachments array
CREATE TABLE task_comment_attachments (
    id CHAR(36) PRIMARY KEY,
    comment_id CHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NULL,
    uploaded_by VARCHAR(100) NULL,

    CONSTRAINT fk_comment_attachments_comment
        FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE,

    INDEX idx_comment_attachments_comment (comment_id)
);

-- Task.attachments array (direct task-level files, not comment files)
CREATE TABLE task_attachments (
    id CHAR(36) PRIMARY KEY,
    task_id CHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_attachments_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_task_attachments_task (task_id)
);

-- Task.activityLog array
CREATE TABLE task_activity_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id CHAR(36) NOT NULL,
    user_id VARCHAR(100) NULL,
    action VARCHAR(255) NOT NULL,
    field VARCHAR(100) NULL,
    old_value JSON NULL,
    new_value JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_activity_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    INDEX idx_task_activity_task (task_id, created_at)
);

-- timeManagement.dailyLogs array
CREATE TABLE task_daily_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id CHAR(36) NOT NULL,
    log_date DATE NOT NULL,
    duration BIGINT NOT NULL DEFAULT 0,   -- ms

    CONSTRAINT fk_task_daily_logs_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,

    UNIQUE KEY uq_task_daily_log (task_id, log_date)
);
