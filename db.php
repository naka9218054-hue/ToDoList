<?php
/**
 * Database Connection & Migration Handler
 * Manages PDO connection to MySQL with automatic database/table initialization
 */

function getDBConnection(): PDO {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';

    $host = $config['host'];
    $port = $config['port'];
    $dbname = $config['dbname'];
    $user = $config['user'];
    $password = $config['password'];
    $charset = $config['charset'] ?? 'utf8mb4';

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset}"
    ];

    try {
        // Step 1: Connect to MySQL server (without selecting DB first, to ensure DB exists)
        $dsnWithoutDB = "mysql:host={$host};port={$port};charset={$charset}";
        $serverPdo = new PDO($dsnWithoutDB, $user, $password, $options);

        // Step 2: Create database if it does not exist
        $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET {$charset} COLLATE {$charset}_unicode_ci");

        // Step 3: Connect to the specific database
        $dsnWithDB = "mysql:host={$host};port={$port};dbname={$dbname};charset={$charset}";
        $pdo = new PDO($dsnWithDB, $user, $password, $options);

        // Step 4: Ensure tables exist
        initializeTables($pdo);

        return $pdo;
    } catch (PDOException $e) {
        // Provide clear error output for API / frontend consumption
        throw new Exception("MySQL接続エラー: " . $e->getMessage());
    }
}

/**
 * Automatically create tables and default data if they do not exist
 */
function initializeTables(PDO $pdo): void {
    // Categories Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `categories` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(50) NOT NULL UNIQUE,
        `color` VARCHAR(20) NOT NULL DEFAULT '#6366f1',
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Tasks Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `tasks` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Default categories seed
    $stmt = $pdo->query("SELECT COUNT(*) FROM `categories`");
    if ($stmt->fetchColumn() == 0) {
        $insert = $pdo->prepare("INSERT IGNORE INTO `categories` (`name`, `color`) VALUES (?, ?)");
        $defaults = [
            ['仕事', '#3b82f6'],
            ['プライベート', '#10b981'],
            ['買い物', '#f59e0b'],
            ['学習', '#8b5cf6'],
            ['健康', '#ec4899'],
            ['一般', '#64748b']
        ];
        foreach ($defaults as $cat) {
            $insert->execute($cat);
        }
    }
}

