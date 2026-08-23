<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ToDo List アプリ - タスク管理</title>
  <link rel="stylesheet" href="css/style.css">
  <!-- Favicon SVG -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✅</text></svg>">
</head>
<body>

  <div class="app-container">

    <!-- Database Error Alert Banner (Hidden by default) -->
    <div id="db-alert-banner" style="display: none; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; padding: 14px 18px; border-radius: 12px; font-size: 0.9rem; margin-bottom: 8px;">
      <div style="font-weight: 700; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        MySQL データベース接続エラー
      </div>
      <div id="db-error-message"></div>
      <div style="margin-top: 6px; font-size: 0.82rem; color: #7f1d1d;">
        ヒント: <code>config.php</code> 内の <code>host</code>, <code>user</code>, <code>password</code> を MySQL サーバーの設定に合わせて調整してください。
      </div>
    </div>

    <!-- App Header -->
    <header class="app-header">
      <div class="brand-section">
        <div class="app-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <div>
          <h1>TaskFlow</h1>
          <p>スマートでシンプルなタスク管理</p>
        </div>
      </div>

      <div class="header-actions">
        <button id="theme-toggle" class="icon-btn" title="テーマ切り替え (ダーク/ライト)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
      </div>
    </header>

    <!-- Dashboard Stats Grid -->
    <section class="stats-container">
      <div class="stat-card">
        <div class="stat-icon total">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value" id="stat-total">0</span>
          <span class="stat-label">総タスク数</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value" id="stat-active">0</span>
          <span class="stat-label">未完了タスク</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon completed">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value" id="stat-completed">0</span>
          <span class="stat-label">完了済み</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon overdue">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value" id="stat-overdue">0</span>
          <span class="stat-label">期限切れ</span>
        </div>
      </div>
    </section>

    <!-- Progress Indicator -->
    <section class="progress-card">
      <div class="progress-header">
        <span>全体の進捗状況</span>
        <span id="progress-text">0% 達成</span>
      </div>
      <div class="progress-track">
        <div id="progress-bar-fill" class="progress-bar-fill"></div>
      </div>
    </section>

    <!-- Task Creation Form -->
    <section class="task-form-card">
      <form id="task-form">
        <div class="quick-add-wrapper">
          <input 
            type="text" 
            id="task-title-input" 
            class="task-input-field" 
            placeholder="新しいタスクを入力... (例: プレゼン資料の作成)" 
            required 
            autocomplete="off"
          >
          <button type="submit" class="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            追加する
          </button>
        </div>

        <div class="form-options-row">
          <div class="option-group">
            <label for="task-category-select">カテゴリ:</label>
            <select id="task-category-select" class="form-select">
              <option value="一般">一般</option>
              <option value="仕事">仕事</option>
              <option value="プライベート">プライベート</option>
              <option value="買い物">買い物</option>
              <option value="学習">学習</option>
              <option value="健康">健康</option>
            </select>
          </div>

          <div class="option-group">
            <label for="task-priority-select">優先度:</label>
            <select id="task-priority-select" class="form-select">
              <option value="low">低 (Low)</option>
              <option value="medium" selected>中 (Medium)</option>
              <option value="high">高 (High)</option>
            </select>
          </div>

          <div class="option-group">
            <label for="task-due-date-input">期限:</label>
            <input type="datetime-local" id="task-due-date-input" class="form-date-input">
          </div>

          <button type="button" id="toggle-details-btn" class="expand-details-btn">
            詳細を追加
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>

          <div id="details-extra" class="details-extra">
            <textarea id="task-desc-input" class="form-textarea" placeholder="タスクのメモや詳細説明を入力 (省略可)..."></textarea>
          </div>
        </div>
      </form>
    </section>

    <!-- Filter & Search Toolbar -->
    <section class="toolbar-card">
      <div class="search-row">
        <div class="search-input-wrapper">
          <span class="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input type="text" id="search-input" class="search-input" placeholder="タスクを検索... (ショートカット: /)">
          <button id="clear-search-btn" class="clear-search-btn" title="検索クリア">✕</button>
        </div>

        <div class="batch-actions">
          <button id="clear-completed-btn" class="btn-secondary" title="完了済みタスクを全削除">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            完了済みを削除
          </button>
        </div>
      </div>

      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
        <div class="filter-pills">
          <button class="pill-btn active" data-filter="all">すべて</button>
          <button class="pill-btn" data-filter="active">未完了</button>
          <button class="pill-btn" data-filter="completed">完了済み</button>
          <button class="pill-btn" data-filter="today">今日が期限</button>
          <button class="pill-btn" data-filter="overdue">期限切れ</button>
        </div>

        <div class="filter-dropdowns">
          <select id="filter-category-select" class="form-select">
            <option value="all">すべてのカテゴリ</option>
          </select>

          <select id="filter-priority-select" class="form-select">
            <option value="all">すべての優先度</option>
            <option value="high">優先度: 高</option>
            <option value="medium">優先度: 中</option>
            <option value="low">優先度: 低</option>
          </select>

          <select id="sort-select" class="form-select">
            <option value="created_desc">作成日 (新しい順)</option>
            <option value="created_asc">作成日 (古い順)</option>
            <option value="due_asc">期限日 (近い順)</option>
            <option value="due_desc">期限日 (遠い順)</option>
            <option value="priority">優先度順</option>
            <option value="title_asc">タスク名順 (A-Z)</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Task List Area -->
    <main>
      <div id="task-list-container" class="task-list-container">
        <!-- Dynamically rendered task cards will appear here -->
      </div>

      <!-- Empty State -->
      <div id="empty-state" class="empty-state" style="display: none;">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        </div>
        <h3>該当するタスクがありません</h3>
        <p>新しいタスクを追加するか、フィルター・検索条件を変更してください。</p>
      </div>
    </main>

  </div>

  <!-- Edit Task Modal Dialog -->
  <dialog id="edit-modal" class="modal-dialog">
    <div class="dialog-header">
      <h3>タスクの編集</h3>
      <button id="close-edit-modal-btn" class="close-modal-btn" title="閉じる">✕</button>
    </div>

    <form id="edit-form">
      <input type="hidden" id="edit-task-id">
      <div class="dialog-body">
        <div class="form-group">
          <label for="edit-task-title">タスク名 <span style="color: var(--danger);">*</span></label>
          <input type="text" id="edit-task-title" required autocomplete="off">
        </div>

        <div class="form-group">
          <label for="edit-task-desc">詳細・メモ</label>
          <textarea id="edit-task-desc" rows="3" placeholder="タスクの詳細を入力..."></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label for="edit-task-category">カテゴリ</label>
            <select id="edit-task-category"></select>
          </div>

          <div class="form-group">
            <label for="edit-task-priority">優先度</label>
            <select id="edit-task-priority">
              <option value="low">低 (Low)</option>
              <option value="medium">中 (Medium)</option>
              <option value="high">高 (High)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="edit-task-due-date">期限日時</label>
          <input type="datetime-local" id="edit-task-due-date">
        </div>

        <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
          <input type="checkbox" id="edit-task-completed" style="width: auto; cursor: pointer;">
          <label for="edit-task-completed" style="cursor: pointer; font-size: 0.9rem; font-weight: 500;">完了済みに設定</label>
        </div>
      </div>

      <div class="dialog-footer">
        <button type="button" id="cancel-edit-btn" class="btn-secondary">キャンセル</button>
        <button type="submit" class="btn-primary">変更を保存</button>
      </div>
    </form>
  </dialog>

  <!-- Toast Notification Container -->
  <div id="toast-container"></div>

  <!-- Main JavaScript -->
  <script src="js/app.js"></script>
</body>
</html>
