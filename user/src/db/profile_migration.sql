-- Run after schema.sql + approval_migration.sql
CREATE TABLE IF NOT EXISTS profiles (
    id              CHAR(36)      NOT NULL PRIMARY KEY,
    user_id         CHAR(36)      NOT NULL,
    type            ENUM('private_tutor','coaching_center','small_institute') NOT NULL,
    location        VARCHAR(255)  NULL,
    experience      INT           NULL,
    description     TEXT          NULL,
    contact_phone   VARCHAR(50)   NULL,
    contact_email   VARCHAR(255)  NULL,
    profile_image   VARCHAR(500)  NULL,
    rating          DECIMAL(3,2)  NOT NULL DEFAULT 0,
    status          ENUM('under_review','approved','rejected') NOT NULL DEFAULT 'under_review',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_profiles_user (user_id),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
