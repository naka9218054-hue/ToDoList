-- ToDoList MySQL Database Schema

CREATE DATABASE IF NOT EXISTS `todolist_app` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `todolist_app`;

-- Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `color` VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT '一般',
    `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `due_date` DATETIME NULL,
    `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
    `completed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`is_completed`),
    INDEX `idx_due_date` (`due_date`),
    INDEX `idx_category` (`category`),
    INDEX `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default categories if table is empty
INSERT IGNORE INTO `categories` (`name`, `color`) VALUES
('仕事', '#3b82f6'),
('プライベート', '#10b981'),
('買い物', '#f59e0b'),
('学習', '#8b5cf6'),
('健康', '#ec4899'),
('一般', '#64748b');

