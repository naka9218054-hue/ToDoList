<?php
/**
 * Database Configuration
 * MySQL connection settings for ToDoList 
 * データ保存先：さくらデータベース abot_db  
 * さくらレンタルサーバーでMySqlのデーターベースにphpアプリから接続できません。config.phpの設定方法を教えてください

 */

return [
    'host'     => 'localhost',
    'dbname'   => 'todolist_app',
    'user'     => 'kenzi',
    'password' => 'Kenzi_1732',
    // ------------
    // 'host'     => 'mysql3117.db.sakura.ne.jp',
    // 'dbname'   => 'abot_todolist',
    // 'user'     => 'abot_todolist',
    // 'password' => 'Kenzi_1732',
    // -----------
    'port'     => '3306',
    'charset'  => 'utf8mb4'
];