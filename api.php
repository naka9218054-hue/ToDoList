<?php
/**
 * RESTful API Handler for ToDoList App
 * Returns JSON responses for all CRUD and analytics operations
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/db.php';

// Helper function to send JSON response
function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Parse request body if JSON
$rawInput = file_get_contents('php://input');
$jsonData = [];
if (!empty($rawInput)) {
    $parsed = json_decode($rawInput, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
        $jsonData = $parsed;
    }
}
$requestData = array_merge($_POST, $jsonData);

$action = $_GET['action'] ?? ($_SERVER['REQUEST_METHOD'] === 'GET' ? 'list' : '');

try {
    $pdo = getDBConnection();
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'error'   => $e->getMessage(),
        'hint'    => 'config.php に設定された MySQL 接続情報（ホスト名、ユーザー名、パスワード等）を確認してください。'
    ], 500);
}

try {
    switch ($action) {
        /**
         * 1. List Tasks
         */
        case 'list':
            $status   = $_GET['status'] ?? 'all';       // all, active, completed, today, upcoming, overdue
            $category = $_GET['category'] ?? 'all';
            $priority = $_GET['priority'] ?? 'all';     // all, high, medium, low
            $search   = trim($_GET['q'] ?? '');
            $sort     = $_GET['sort'] ?? 'created_desc';// due_asc, due_desc, priority, created_desc, created_asc, title_asc

            $whereClauses = [];
            $params = [];

            // Status filter
            if ($status === 'active') {
                $whereClauses[] = "is_completed = 0";
            } elseif ($status === 'completed') {
                $whereClauses[] = "is_completed = 1";
            } elseif ($status === 'today') {
                $whereClauses[] = "due_date IS NOT NULL AND DATE(due_date) = CURDATE()";
            } elseif ($status === 'upcoming') {
                $whereClauses[] = "due_date IS NOT NULL AND DATE(due_date) > CURDATE() AND is_completed = 0";
            } elseif ($status === 'overdue') {
                $whereClauses[] = "due_date IS NOT NULL AND due_date < NOW() AND is_completed = 0";
            }

            // Category filter
            if ($category !== 'all' && $category !== '') {
                $whereClauses[] = "category = ?";
                $params[] = $category;
            }

            // Priority filter
            if (in_array($priority, ['low', 'medium', 'high'], true)) {
                $whereClauses[] = "priority = ?";
                $params[] = $priority;
            }

            // Search query
            if ($search !== '') {
                $whereClauses[] = "(title LIKE ? OR description LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }

            $sql = "SELECT * FROM `tasks`";
            if (!empty($whereClauses)) {
                $sql .= " WHERE " . implode(" AND ", $whereClauses);
            }

            // Sorting
            switch ($sort) {
                case 'due_asc':
                    $sql .= " ORDER BY is_completed ASC, CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, id DESC";
                    break;
                case 'due_desc':
                    $sql .= " ORDER BY is_completed ASC, CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date DESC, id DESC";
                    break;
                case 'priority':
                    $sql .= " ORDER BY is_completed ASC, FIELD(priority, 'high', 'medium', 'low'), due_date ASC, id DESC";
                    break;
                case 'created_asc':
                    $sql .= " ORDER BY is_completed ASC, created_at ASC";
                    break;
                case 'title_asc':
                    $sql .= " ORDER BY is_completed ASC, title ASC";
                    break;
                case 'created_desc':
                default:
                    $sql .= " ORDER BY is_completed ASC, created_at DESC";
                    break;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $tasks = $stmt->fetchAll();

            // Calculate overdue status in payload
            $now = time();
            foreach ($tasks as &$task) {
                $task['is_completed'] = (bool)$task['is_completed'];
                $task['is_overdue'] = false;
                if (!empty($task['due_date']) && !$task['is_completed']) {
                    $task['is_overdue'] = (strtotime($task['due_date']) < $now);
                }
            }

            jsonResponse([
                'success' => true,
                'data'    => $tasks,
                'count'   => count($tasks)
            ]);
            break;

        /**
         * 2. Create Task
         */
        case 'create':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
            }

            $title = trim($requestData['title'] ?? '');
            if (empty($title)) {
                jsonResponse(['success' => false, 'error' => 'タスク名は必須です。'], 400);
            }

            $description = trim($requestData['description'] ?? '');
            $category    = trim($requestData['category'] ?? '一般');
            $priority    = in_array($requestData['priority'] ?? '', ['low', 'medium', 'high'], true) ? $requestData['priority'] : 'medium';
            $dueDate     = !empty($requestData['due_date']) ? date('Y-m-d H:i:s', strtotime($requestData['due_date'])) : null;

            $stmt = $pdo->prepare("
                INSERT INTO `tasks` (`title`, `description`, `category`, `priority`, `due_date`, `is_completed`) 
                VALUES (?, ?, ?, ?, ?, 0)
            ");
            $stmt->execute([$title, $description ?: null, $category ?: '一般', $priority, $dueDate]);
            $newId = (int)$pdo->lastInsertId();

            $fetchStmt = $pdo->prepare("SELECT * FROM `tasks` WHERE id = ?");
            $fetchStmt->execute([$newId]);
            $newTask = $fetchStmt->fetch();
            if ($newTask) {
                $newTask['is_completed'] = (bool)$newTask['is_completed'];
                $newTask['is_overdue'] = (!empty($newTask['due_date']) && strtotime($newTask['due_date']) < time());
            }

            jsonResponse([
                'success' => true,
                'message' => 'タスクを追加しました。',
                'data'    => $newTask
            ], 201);
            break;

        /**
         * 3. Update Task
         */
        case 'update':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
            }

            $id = (int)($requestData['id'] ?? 0);
            if ($id <= 0) {
                jsonResponse(['success' => false, 'error' => '無効なタスクIDです。'], 400);
            }

            $title = trim($requestData['title'] ?? '');
            if (empty($title)) {
                jsonResponse(['success' => false, 'error' => 'タスク名は必須です。'], 400);
            }

            $description = trim($requestData['description'] ?? '');
            $category    = trim($requestData['category'] ?? '一般');
            $priority    = in_array($requestData['priority'] ?? '', ['low', 'medium', 'high'], true) ? $requestData['priority'] : 'medium';
            $dueDate     = !empty($requestData['due_date']) ? date('Y-m-d H:i:s', strtotime($requestData['due_date'])) : null;
            $isCompleted = isset($requestData['is_completed']) ? ($requestData['is_completed'] ? 1 : 0) : null;

            if ($isCompleted !== null) {
                $completedAt = $isCompleted ? date('Y-m-d H:i:s') : null;
                $stmt = $pdo->prepare("
                    UPDATE `tasks` 
                    SET `title` = ?, `description` = ?, `category` = ?, `priority` = ?, `due_date` = ?, `is_completed` = ?, `completed_at` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$title, $description ?: null, $category ?: '一般', $priority, $dueDate, $isCompleted, $completedAt, $id]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE `tasks` 
                    SET `title` = ?, `description` = ?, `category` = ?, `priority` = ?, `due_date` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([$title, $description ?: null, $category ?: '一般', $priority, $dueDate, $id]);
            }

            $fetchStmt = $pdo->prepare("SELECT * FROM `tasks` WHERE id = ?");
            $fetchStmt->execute([$id]);
            $updatedTask = $fetchStmt->fetch();
            if ($updatedTask) {
                $updatedTask['is_completed'] = (bool)$updatedTask['is_completed'];
                $updatedTask['is_overdue'] = (!empty($updatedTask['due_date']) && !$updatedTask['is_completed'] && strtotime($updatedTask['due_date']) < time());
            }

            jsonResponse([
                'success' => true,
                'message' => 'タスクを更新しました。',
                'data'    => $updatedTask
            ]);
            break;

        /**
         * 4. Toggle Task Completion
         */
        case 'toggle':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
            }

            $id = (int)($requestData['id'] ?? 0);
            if ($id <= 0) {
                jsonResponse(['success' => false, 'error' => '無効なタスクIDです。'], 400);
            }

            $checkStmt = $pdo->prepare("SELECT `is_completed` FROM `tasks` WHERE `id` = ?");
            $checkStmt->execute([$id]);
            $currentStatus = $checkStmt->fetchColumn();

            if ($currentStatus === false) {
                jsonResponse(['success' => false, 'error' => 'タスクが見つかりません。'], 404);
            }

            $newStatus = $currentStatus ? 0 : 1;
            $completedAt = $newStatus ? date('Y-m-d H:i:s') : null;

            $updateStmt = $pdo->prepare("UPDATE `tasks` SET `is_completed` = ?, `completed_at` = ? WHERE `id` = ?");
            $updateStmt->execute([$newStatus, $completedAt, $id]);

            $fetchStmt = $pdo->prepare("SELECT * FROM `tasks` WHERE `id` = ?");
            $fetchStmt->execute([$id]);
            $toggledTask = $fetchStmt->fetch();
            if ($toggledTask) {
                $toggledTask['is_completed'] = (bool)$toggledTask['is_completed'];
                $toggledTask['is_overdue'] = (!empty($toggledTask['due_date']) && !$toggledTask['is_completed'] && strtotime($toggledTask['due_date']) < time());
            }

            jsonResponse([
                'success' => true,
                'message' => $newStatus ? 'タスクを完了にしました。' : 'タスクを未完了に戻しました。',
                'data'    => $toggledTask
            ]);
            break;

        /**
         * 5. Delete Task
         */
        case 'delete':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
            }

            $id = (int)($requestData['id'] ?? 0);
            if ($id <= 0) {
                jsonResponse(['success' => false, 'error' => '無効なタスクIDです。'], 400);
            }

            $stmt = $pdo->prepare("DELETE FROM `tasks` WHERE `id` = ?");
            $stmt->execute([$id]);

            jsonResponse([
                'success' => true,
                'message' => 'タスクを削除しました。',
                'id'      => $id
            ]);
            break;

        /**
         * 6. Clear All Completed Tasks
         */
        case 'clear_completed':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
            }

            $stmt = $pdo->prepare("DELETE FROM `tasks` WHERE `is_completed` = 1");
            $stmt->execute();
            $deletedCount = $stmt->rowCount();

            jsonResponse([
                'success' => true,
                'message' => "完了済みタスク ({$deletedCount}件) を削除しました。",
                'count'   => $deletedCount
            ]);
            break;

        /**
         * 7. Statistics & Analytics
         */
        case 'stats':
            $total = (int)$pdo->query("SELECT COUNT(*) FROM `tasks`")->fetchColumn();
            $completed = (int)$pdo->query("SELECT COUNT(*) FROM `tasks` WHERE is_completed = 1")->fetchColumn();
            $active = $total - $completed;
            $overdue = (int)$pdo->query("SELECT COUNT(*) FROM `tasks` WHERE is_completed = 0 AND due_date IS NOT NULL AND due_date < NOW()")->fetchColumn();
            $dueToday = (int)$pdo->query("SELECT COUNT(*) FROM `tasks` WHERE is_completed = 0 AND due_date IS NOT NULL AND DATE(due_date) = CURDATE()")->fetchColumn();

            $rate = $total > 0 ? round(($completed / $total) * 100, 1) : 0;

            // Categories summary
            $catStmt = $pdo->query("
                SELECT category, COUNT(*) as count 
                FROM `tasks` 
                GROUP BY category 
                ORDER BY count DESC
            ");
            $categoriesCount = $catStmt->fetchAll();

            // Priority summary
            $priStmt = $pdo->query("
                SELECT priority, COUNT(*) as count 
                FROM `tasks` 
                WHERE is_completed = 0 
                GROUP BY priority
            ");
            $prioritiesCount = $priStmt->fetchAll();

            jsonResponse([
                'success' => true,
                'data'    => [
                    'total'        => $total,
                    'completed'    => $completed,
                    'active'       => $active,
                    'overdue'      => $overdue,
                    'due_today'    => $dueToday,
                    'completion_rate' => $rate,
                    'categories'   => $categoriesCount,
                    'priorities'   => $prioritiesCount
                ]
            ]);
            break;

        /**
         * 8. List Categories
         */
        case 'categories':
            $stmt = $pdo->query("
                SELECT c.id, c.name, c.color, COUNT(t.id) as task_count
                FROM `categories` c
                LEFT JOIN `tasks` t ON c.name = t.category AND t.is_completed = 0
                GROUP BY c.id, c.name, c.color
                ORDER BY c.id ASC
            ");
            $categories = $stmt->fetchAll();

            jsonResponse([
                'success' => true,
                'data'    => $categories
            ]);
            break;

        /**
         * 9. Add Custom Category
         */
        case 'add_category':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
            }

            $name = trim($requestData['name'] ?? '');
            $color = trim($requestData['color'] ?? '#6366f1');

            if (empty($name)) {
                jsonResponse(['success' => false, 'error' => 'カテゴリ名は必須です。'], 400);
            }

            $stmt = $pdo->prepare("INSERT INTO `categories` (`name`, `color`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `color` = VALUES(`color`)");
            $stmt->execute([$name, $color]);

            jsonResponse([
                'success' => true,
                'message' => 'カテゴリを追加しました。',
                'data'    => [
                    'id'    => (int)$pdo->lastInsertId(),
                    'name'  => $name,
                    'color' => $color
                ]
            ]);
            break;

        default:
            jsonResponse(['success' => false, 'error' => '不正なアクションです。'], 400);
    }
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'error'   => 'エラーが発生しました: ' . $e->getMessage()
    ], 500);
}

