<?php
/**
 * Database Configuration with Automatic Environment Switching
 * ローカル開発環境（localhost）とさくらレンタルサーバー環境を自動判定して設定を切り替えます。 
 */

// 実行環境の自動判定（HTTPホスト名、サーバー名、ドキュメントルートより判定）
$httpHost   = $_SERVER['HTTP_HOST'] ?? '';
$serverName = $_SERVER['SERVER_NAME'] ?? '';
$docRoot    = $_SERVER['DOCUMENT_ROOT'] ?? '';

// さくらレンタルサーバー環境かどうかの判定フラグ
// 1. ドメイン名に "sakura.ne.jp" が含まれる場合
// 2. あるいは /home/ ディレクトリ配下で動作し、localhost でない場合
$isSakura = (
    strpos($httpHost, 'sakura.ne.jp') !== false ||
    strpos($serverName, 'sakura.ne.jp') !== false ||
    (strpos($docRoot, '/home/') !== false && strpos($httpHost, 'localhost') === false && strpos($httpHost, '127.0.0.1') === false)
);

if ($isSakura) {
    // --------------------------------------------------------------------------
    // さくらレンタルサーバー用のデータベース設定
    // --------------------------------------------------------------------------
    return [
        'host'     => 'mysql3117.db.sakura.ne.jp',
        'dbname'   => 'abot_todolist',
        'user'     => 'abot_todolist',
        'password' => 'Kenzi_1732',
        'port'     => '3306',
        'charset'  => 'utf8mb4',
        'env'      => 'sakura'
    ];
} else {
    // --------------------------------------------------------------------------
    // ローカル開発環境用のデータベース設定 (localhost)
    // --------------------------------------------------------------------------
    return [
        'host'     => 'localhost',
        'dbname'   => 'todolist_app',
        'user'     => 'kenzi',
        'password' => 'Kenzi_1732',
        'port'     => '3306',
        'charset'  => 'utf8mb4',
        'env'      => 'local'
    ];
}