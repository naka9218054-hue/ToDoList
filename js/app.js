/**
 * ToDoList アプリケーション - モダン Vanilla JavaScript (ピュアJS)
 * 画面のUI操作、Fetch APIによる通信、アプリケーションの状態管理(State)、
 * およびリスト表示・スケジュール表示のレンダリング処理を一括管理します。
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // アプリケーション全体の centralized state（状態管理オブジェクト）
  // --------------------------------------------------------------------------
  const state = {
    filter: 'all',          // タスクフィルター状態: all (すべて) | active (未完了) | completed (完了済み) | today (今日が期限) | overdue (期限切れ)
    category: 'all',        // カテゴリフィルター: all (すべてのカテゴリ) または特定のカテゴリ名
    priority: 'all',        // 優先度フィルター: all (すべての優先度) | high (高) | medium (中) | low (低)
    sort: 'created_desc',   // ソート順序: created_desc (作成日降順) | created_asc (作成日昇順) | due_asc (期限昇順) | due_desc (期限降順) | priority (優先度順) | title_asc (タイトル名順)
    searchQuery: '',        // 検索キーワード文字列
    viewMode: 'list',       // メイン表示モード: list (標準リスト表示) | schedule (4週間スケジュールマトリックス表示)
    scheduleOffsetDays: 0,  // スケジュール表示の基準日オフセット（0: 今週基準, ±7: 前後の週へ移動）
    categories: [],         // サーバーから取得したカテゴリ一覧データ
    tasks: []               // サーバーから取得したタスク一覧データ
  };

  // --------------------------------------------------------------------------
  // DOMエレメントの参照保持（パフォーマンス向上のため初期化時に一括取得）
  // --------------------------------------------------------------------------
  // ヘッダー・表示切り替え・テーマ切り替え関連要素
  const themeToggleBtn = document.getElementById('theme-toggle');        // ダーク/ライトテーマ切り替えボタン
  const viewModeListBtn = document.getElementById('view-mode-list');      // リスト表示モード切り替えボタン
  const viewModeScheduleBtn = document.getElementById('view-mode-schedule'); // スケジュール表示モード切り替えボタン
  const scheduleViewContainer = document.getElementById('schedule-view-container'); // スケジュール表示全体のコンテナ

  // スケジュール表示のナビゲーションおよびテーブル関連要素
  const schedPrevWeekBtn = document.getElementById('sched-prev-week');         // スケジュール前週移動ボタン
  const schedNextWeekBtn = document.getElementById('sched-next-week');         // スケジュール次週移動ボタン
  const schedTodayBtn = document.getElementById('sched-today');               // スケジュール今週（今日）復帰ボタン
  const scheduleRangeLabel = document.getElementById('schedule-range-label');   // スケジュール表示期間ラベル（例: 2026年8月29日〜2026年9月25日 (4週間)）
  const scheduleTableHeader = document.getElementById('schedule-table-header'); // スケジュールマトリックスのヘッダー行 (tr)
  const scheduleTableBody = document.getElementById('schedule-table-body');   // スケジュールマトリックスのボディ (tbody)
  const unscheduledCountBadge = document.getElementById('unscheduled-count-badge'); // 日付指定なしタスク件数バッジ
  const unscheduledTasksList = document.getElementById('unscheduled-tasks-list'); // 日付指定なしタスクカード設置エリア

  // タスク新規登録フォーム関連要素
  const taskForm = document.getElementById('task-form');                         // タスク作成フォーム
  const taskTitleInput = document.getElementById('task-title-input');             // タスクタイトル入力欄
  const taskCategorySelect = document.getElementById('task-category-select');     // カテゴリ選択セレクトボックス
  const taskPrioritySelect = document.getElementById('task-priority-select');     // 優先度選択セレクトボックス
  const taskDueDateInput = document.getElementById('task-due-date-input');         // 期限日時入力欄
  const taskDescInput = document.getElementById('task-desc-input');               // タスク詳細メモ入力欄
  const toggleDetailsBtn = document.getElementById('toggle-details-btn');         // 詳細メモ入力展開/折りたたみボタン
  const detailsExtra = document.getElementById('details-extra');                 // 詳細メモの折りたたみ枠コンテナ

  // 検索・フィルター・並び替え関連要素
  const searchInput = document.getElementById('search-input');                   // キーワード検索入力欄
  const clearSearchBtn = document.getElementById('clear-search-btn');             // 検索キーワードクリアボタン
  const filterPills = document.querySelectorAll('.pill-btn');                     // ステータスフィルターピルボタン群
  const filterCategorySelect = document.getElementById('filter-category-select'); // 絞り込みカテゴリセレクトボックス
  const filterPrioritySelect = document.getElementById('filter-priority-select'); // 絞り込み優先度セレクトボックス
  const sortSelect = document.getElementById('sort-select');                     // ソート順セレクトボックス
  const clearCompletedBtn = document.getElementById('clear-completed-btn');       // 完了済み一括削除ボタン

  // メイン一覧・空状態表示関連要素
  const taskListContainer = document.getElementById('task-list-container');       // 標準リスト表示のタスクカード設置コンテナ
  const emptyState = document.getElementById('empty-state');                     // 該当タスクなし時の空状態案内表示

  // ダッシュボード統計および進捗バー関連要素
  const statTotal = document.getElementById('stat-total');           // 総タスク数カウンター
  const statActive = document.getElementById('stat-active');         // 未完了タスク数カウンター
  const statCompleted = document.getElementById('stat-completed');   // 完了済みタスク数カウンター
  const statOverdue = document.getElementById('stat-overdue');       // 期限切れタスク数カウンター
  const progressText = document.getElementById('progress-text');     // 進捗率テキスト表示 (例: "75% 達成")
  const progressBarFill = document.getElementById('progress-bar-fill'); // 進捗バーのプログレスフィルの幅設定

  // タスク編集用モーダルダイアログ関連要素
  const editModal = document.getElementById('edit-modal');               // 編集用 HTML <dialog> 要素
  const editForm = document.getElementById('edit-form');                 // モーダル内編集フォーム
  const editTaskId = document.getElementById('edit-task-id');             // 編集対象のタスクID（非表示フィールド）
  const editTitle = document.getElementById('edit-task-title');           // 編集用タイトル入力欄
  const editDescription = document.getElementById('edit-task-desc');     // 編集用詳細メモ入力欄
  const editCategory = document.getElementById('edit-task-category');     // 編集用カテゴリセレクトボックス
  const editPriority = document.getElementById('edit-task-priority');     // 編集用優先度セレクトボックス
  const editDueDate = document.getElementById('edit-task-due-date');       // 編集用期限日時入力欄
  const editCompleted = document.getElementById('edit-task-completed');   // 編集用完了フラグチェックボックス
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn'); // モーダル閉じる「✕」ボタン
  const cancelEditBtn = document.getElementById('cancel-edit-btn');       // モーダル「キャンセル」ボタン

  // データベース接続エラー警告バナー関連要素
  const dbAlertBanner = document.getElementById('db-alert-banner');     // DBエラー警告バナー
  const dbErrorMessage = document.getElementById('db-error-message');   // DBエラー詳細メッセージ表示部

  // --------------------------------------------------------------------------
  // 1. テーマ管理機能 (Theme Management)
  //  クリックイベントで `data-theme` 属性（dark / light）を切り替え、
  //  localStorage にテーマ設定を保存して次回訪問時にも設定を保持します。
  // --------------------------------------------------------------------------
  /**
   * テーマの初期化処理
   * localStorage に保存されたテーマ設定またはOSのシステムカラー設定を参照します。
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('todo_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
  }

  /**
   * 指定されたテーマ（'dark' または 'light'）をドキュメントルートに適用し、ボタンのアイコンを更新します。
   * @param {string} theme - 適用するテーマ名
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('todo_theme', theme);
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === 'dark'
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
  }

  // テーマ切り替えボタンのクリックイベントリスナー設定
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  // --------------------------------------------------------------------------
  // 2. トースト通知表示機能 (Toast Notifications)
  //  画面右下に成功・エラー・情報メッセージをスタック形式で一時表示します。
  // --------------------------------------------------------------------------
  /**
   * トーストポップアップメッセージを表示します。
   * @param {string} message - 表示するメッセージ
   * @param {'info'|'success'|'error'} type - 通知の種類（スタイリングとアイコンに反映）
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    // 3秒後にアニメーションを終了して要素を自動削除
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3000);
  }

  // --------------------------------------------------------------------------
  // 3. API 通信ヘルパー関数 (API Communication Helper)
  //  Fetch API による JSON データ送受信、エラーハンドリング、DBエラー表示を一括処理
  // --------------------------------------------------------------------------
  /**
   * サーバーの api.php へ非同期リクエストを送信する共通関数
   * @param {string} endpoint - 通信先エンドポイントのURL
   * @param {string} method - HTTPメソッド ('GET' | 'POST' | 'PUT' など)
   * @param {Object|null} data - POST/PUT 時に送信するデータオブジェクト
   * @returns {Promise<Object>} サーバーからのレスポンスオブジェクト
   */
  async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: {
          'Accept': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }

      const res = await fetch(endpoint, options);
      const json = await res.json();

      if (!res.ok || !json.success) {
        // データベース接続エラー等のヒントが存在する場合は上部のアラートバナーを表示
        if (json.hint && dbAlertBanner && dbErrorMessage) {
          dbErrorMessage.innerText = `${json.error || 'エラー'} (${json.hint})`;
          dbAlertBanner.style.display = 'block';
        }
        throw new Error(json.error || 'リクエストの処理中にエラーが発生しました。');
      }

      // 正常レスポンス時はエラーバナーを非表示にする
      if (dbAlertBanner) dbAlertBanner.style.display = 'none';
      return json;
    } catch (err) {
      console.error('API Error:', err);
      showToast(err.message, 'error');
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // 4. データ読み込み＆ダッシュボード統計更新 (Data Loading & Stats)
  // --------------------------------------------------------------------------
  /**
   * サーバーからカテゴリ一覧を取得し、各ドロップダウンの選択肢を更新します。
   */
  async function fetchCategories() {
    try {
      const res = await apiRequest('api.php?action=categories');
      if (res && res.data) {
        state.categories = res.data;
        renderCategoryOptions();
      }
    } catch (e) {
      // エラー処理は apiRequest 内で統一実行
    }
  }

  /**
   * カテゴリ選択用の各 `<select>` ドロップダウン（新規作成、フィルター、モーダル編集）の選択肢を描画します。
   */
  function renderCategoryOptions() {
    const defaultOptions = ['一般', '仕事', 'プライベート', '買い物', '学習', '健康'];
    const currentList = state.categories.length ? state.categories.map(c => c.name) : defaultOptions;

    // クイック追加フォーム用カテゴリセレクトボックス
    const currentSelected = taskCategorySelect.value;
    taskCategorySelect.innerHTML = currentList.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (currentList.includes(currentSelected)) taskCategorySelect.value = currentSelected;

    // 絞り込みフィルター用カテゴリセレクトボックス
    filterCategorySelect.innerHTML = `<option value="all">すべてのカテゴリ</option>` +
      currentList.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (state.category !== 'all') filterCategorySelect.value = state.category;

    // モーダル編集用カテゴリセレクトボックス
    editCategory.innerHTML = currentList.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
  }

  /**
   * サーバーからダッシュボード用統計データ（総件数・未完了・完了・期限切れ・進捗率）を取得して表示を更新します。
   */
  async function fetchStats() {
    try {
      const res = await apiRequest('api.php?action=stats');
      if (res && res.data) {
        const d = res.data;
        statTotal.textContent = d.total;
        statActive.textContent = d.active;
        statCompleted.textContent = d.completed;
        statOverdue.textContent = d.overdue;

        const rate = d.completion_rate || 0;
        progressText.textContent = `${rate}% 達成`;
        progressBarFill.style.width = `${rate}%`;
      }
    } catch (e) {
      // エラー処理は apiRequest 内で統一実行
    }
  }

  /**
   * 現在の state 条件（フィルター、カテゴリ、優先度、ソート順、検索語）に基づいてサーバーからタスク一覧を取得します。
   */
  async function fetchTasks() {
    const params = new URLSearchParams({
      action: 'list',
      status: state.filter,
      category: state.category,
      priority: state.priority,
      sort: state.sort,
      q: state.searchQuery
    });

    try {
      const res = await apiRequest(`api.php?${params.toString()}`);
      if (res && res.data) {
        state.tasks = res.data;
        renderTasks();
      }
    } catch (e) {
      // エラー処理は apiRequest 内で統一実行
    }
  }

  // --------------------------------------------------------------------------
  // 5. タスク一覧およびスケジュール表示のレンダリング (Task List & Schedule Rendering)
  // --------------------------------------------------------------------------
  /**
   * 現在の viewMode（'list' または 'schedule'）に応じて適切な画面表示を切り替えます。
   */
  function renderTasks() {
    if (state.viewMode === 'schedule') {
      taskListContainer.style.display = 'none';
      scheduleViewContainer.style.display = 'flex';
      renderScheduleView();
    } else {
      scheduleViewContainer.style.display = 'none';
      taskListContainer.style.display = 'flex';
      renderListView();
    }
  }

  /**
   * 標準リスト表示モードのタスクカード描画処理
   */
  function renderListView() {
    taskListContainer.innerHTML = '';

    if (state.tasks.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';

    state.tasks.forEach(task => {
      const card = createTaskCard(task);
      taskListContainer.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // 5b. スケジュールマトリックス描画処理 (Schedule Matrix View Rendering)
  //  左側にDoリスト(タスク名)、上部に第1週(日付ごと7列) + 第2・3・4週のまとめ(3列)を表示
  // --------------------------------------------------------------------------
  /**
   * スケジュール表示（4週間マトリックスおよび日付指定なしタスク一覧）を描画します。
   */
  function renderScheduleView() {
    emptyState.style.display = 'none';

    // 1. scheduleOffsetDays に基づいて第1週目の7日間（個別日付）を算出
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + state.scheduleOffsetDays);

    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    const dateColumns = []; // 第1週目・日別7列のオブジェクト配列

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateNum}`;

      const dayName = daysOfWeek[d.getDay()];
      const isToday = d.getTime() === today.getTime();

      dateColumns.push({
        type: 'day',
        dateObj: d,
        dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()} (${dayName})`,
        isToday
      });
    }

    // 2. 第2週、第3週、第4週のまとめ列（各7日間の範囲まとめ）を算出
    const weekSummaryColumns = [];
    for (let w = 2; w <= 4; w++) {
      const wStart = new Date(startDate);
      wStart.setDate(wStart.getDate() + (w - 1) * 7);

      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);

      const formatYMD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dateNum = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dateNum}`;
      };

      const startMD = `${wStart.getMonth() + 1}/${wStart.getDate()}`;
      const endMD = `${wEnd.getMonth() + 1}/${wEnd.getDate()}`;

      weekSummaryColumns.push({
        type: 'week',
        weekNum: w,
        startDateStr: formatYMD(wStart),
        endDateStr: formatYMD(wEnd),
        // label: `第${w}週 (${startMD}〜${endMD})`　/* 第２−４週の日付消去    */
        label: `第${w}週`
      });
    }

    // 全10列（日別7列 + 週まとめ3列）を結合
    const allColumns = [...dateColumns, ...weekSummaryColumns];

    // スケジュール表示期間のラベルテキストを更新（例: 2026年8月29日 〜 2026年9月25日 (4週間)）
    const firstCol = dateColumns[0];
    const lastWeekCol = weekSummaryColumns[weekSummaryColumns.length - 1];
    const lastWeekEndDate = new Date(lastWeekCol.endDateStr);
    scheduleRangeLabel.textContent = `${firstCol.dateObj.getFullYear()}年${firstCol.dateObj.getMonth() + 1}月${firstCol.dateObj.getDate()}日 〜 ${lastWeekEndDate.getMonth() + 1}月${lastWeekEndDate.getDate()}日 (4週間)`;

    // 3. テーブルヘッダー (th) を動的に生成
    scheduleTableHeader.innerHTML = `
      <th class="col-task-header">Doリスト (タスク名)</th>
      ${dateColumns.map(col => `
        <th class="col-date-header ${col.isToday ? 'is-today' : ''}">
          ${escapeHtml(col.label)}
          ${col.isToday ? '<div style="font-size: 0.7rem; color: var(--primary); font-weight:700;">今日</div>' : ''}
        </th>
      `).join('')}
      ${weekSummaryColumns.map(col => `
        <th class="col-week-header">
          ${escapeHtml(col.label)}
        </th>
      `).join('')}
    `;

    // 4. タスクを「期限日時あり（マトリックス表示対象）」と「期限日時なし（未定リスト対象）」に分類
    const scheduledTasks = state.tasks.filter(t => t.due_date && t.due_date.trim() !== '');
    const unscheduledTasks = state.tasks.filter(t => !t.due_date || t.due_date.trim() === '');

    // 5. 期限日時ありタスクのテーブル行 (tr) をレンダリング
    scheduleTableBody.innerHTML = '';

    if (scheduledTasks.length === 0) {
      scheduleTableBody.innerHTML = `
        <tr>
          <td colspan="${allColumns.length + 1}" style="padding: 24px; text-align: center; color: var(--text-muted);">
            期限日時が設定されたDoリストタスクがありません。下の「日付指定なしのタスク」から日付を設定してください。
          </td>
        </tr>
      `;
    } else {
      scheduledTasks.forEach(task => {
        const tr = document.createElement('tr');

        // タスクの日付文字列 (YYYY-MM-DD)
        const taskDateStr = task.due_date ? task.due_date.split(' ')[0] : '';

        // 優先度バッジのラベルマッピング
        const priorityLabels = { high: '高', medium: '中', low: '低' };

        // 左端列: タスク名およびメタ情報（カテゴリ・優先度）
        let taskInfoHtml = `
          <td class="cell-task-info">
            <div class="sched-task-title ${task.is_completed ? 'completed' : ''}">${escapeHtml(task.title)}</div>
            <div class="sched-task-meta">
              <span class="badge badge-category">${escapeHtml(task.category)}</span>
              <span class="badge badge-priority-${task.priority}">${priorityLabels[task.priority]}</span>
            </div>
          </td>
        `;

        // 全10列分（日別7列 + 週まとめ3列）のセル HTML を生成
        let matrixCellsHtml = allColumns.map(col => {
          let matches = false;
          let targetDateStr = '';
          let defaultMarkText = '◎';

          if (col.type === 'day') {
            matches = (taskDateStr === col.dateStr);
            targetDateStr = col.dateStr;
          } else if (col.type === 'week') {
            matches = (taskDateStr >= col.startDateStr && taskDateStr <= col.endDateStr);
            targetDateStr = col.startDateStr; // クリックで日付を設定する場合、その週の開始日をデフォルトに設定
            // defaultMarkText = `✓ 第${col.weekNum}週`;
            defaultMarkText = `◎`;
          }

          if (matches) {
            let badgeClass = 'active';
            let markText = defaultMarkText;

            if (task.is_completed) {
              badgeClass = 'completed';
              markText = '✓ 完了';
            } else if (task.is_overdue) {
              badgeClass = 'overdue';
              markText = '⚠️ 期限切れ';
            }

            return `
              <td class="schedule-cell marked is-${badgeClass} ${col.type === 'week' ? 'week-cell' : ''}" data-task-id="${task.id}" data-date="${targetDateStr}" title="クリックで完了ステータス切り替え">
                <span class="sched-mark-badge ${badgeClass}">${markText}</span>
              </td>
            `;
          } else {
            return `
              <td class="schedule-cell ${col.type === 'week' ? 'week-cell' : ''}" data-task-id="${task.id}" data-date="${targetDateStr}" title="${col.type === 'week' ? `第${col.weekNum}週の開始日に設定` : 'この日に実施日を変更'}">
                <span class="sched-cell-empty">+ 設定</span>
              </td>
            `;
          }
        }).join('');

        tr.innerHTML = taskInfoHtml + matrixCellsHtml;

        // スケジュールマトリックスの各セルにクリックイベントを設定
        tr.querySelectorAll('.schedule-cell').forEach(cell => {
          cell.addEventListener('click', () => {
            const taskId = parseInt(cell.dataset.taskId, 10);
            const targetDateStr = cell.dataset.date;

            if (cell.classList.contains('marked')) {
              // 既にマークされているセルの場合: タスクの完了/未完了ステータスをトグル切り替え
              toggleTaskCompletion(taskId);
            } else {
              // 空のセルの場合: クリックした日付（または週の開始日）に実施日を変更割り当て
              assignTaskDueDate(taskId, targetDateStr);
            }
          });
        });

        scheduleTableBody.appendChild(tr);
      });
    }

    // 6. 日付指定なしタスク（未定のDoリスト）セクションを描画
    renderUnscheduledTasks(unscheduledTasks, dateColumns);
  }

  /**
   * 日付指定の無いタスク一覧（カード表示）を描画します。
   * @param {Array} unscheduledTasks - 日付未設定のタスク配列
   * @param {Array} dateColumns - 表示中の日付列情報（「今日」の日付特定用）
   */
  function renderUnscheduledTasks(unscheduledTasks, dateColumns) {
    unscheduledCountBadge.textContent = `${unscheduledTasks.length}件`;
    unscheduledTasksList.innerHTML = '';

    if (unscheduledTasks.length === 0) {
      unscheduledTasksList.innerHTML = `
        <div class="empty-unscheduled">
          日付指定のないタスクはありません✨
        </div>
      `;
      return;
    }

    const todayStr = dateColumns.find(c => c.isToday)?.dateStr || new Date().toISOString().split('T')[0];

    unscheduledTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'unscheduled-card';

      const priorityLabels = { high: '高', medium: '中', low: '低' };

      card.innerHTML = `
        <div class="unscheduled-card-header">
          <label class="custom-checkbox" title="${task.is_completed ? '未完了に戻す' : '完了にする'}">
            <input type="checkbox" ${task.is_completed ? 'checked' : ''} class="task-checkbox">
            <span class="checkmark">
              <svg class="checkmark-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          </label>
          <div class="unscheduled-card-body">
            <div class="unscheduled-card-title ${task.is_completed ? 'completed' : ''}">${escapeHtml(task.title)}</div>
            <div class="task-meta">
              <span class="badge badge-category">${escapeHtml(task.category)}</span>
              <span class="badge badge-priority-${task.priority}">優先度: ${priorityLabels[task.priority]}</span>
            </div>
          </div>
        </div>

        <div class="unscheduled-card-actions">
          <button class="btn-assign-date btn-today" data-task-id="${task.id}" data-date="${todayStr}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            今日に設定
          </button>
          <button class="action-btn btn-edit" data-task-id="${task.id}" title="編集・日付指定">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
        </div>
      `;

      // イベントリスナーの追加
      const checkbox = card.querySelector('.task-checkbox');
      checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

      const assignTodayBtn = card.querySelector('.btn-today');
      assignTodayBtn.addEventListener('click', () => assignTaskDueDate(task.id, todayStr));

      const editBtn = card.querySelector('.btn-edit');
      editBtn.addEventListener('click', () => openEditModal(task));

      unscheduledTasksList.appendChild(card);
    });
  }

  /**
   * 指定したタスクの実施日（due_date）を更新するクイック設定関数
   * @param {number} taskId - タスクID
   * @param {string} dateStr - 割り当てる日付 (YYYY-MM-DD)
   */
  async function assignTaskDueDate(taskId, dateStr) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // 時刻が指定されていない場合はデフォルト時刻「09:00:00」を付与
    const fullDueDate = `${dateStr} 09:00:00`;

    const payload = {
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      due_date: fullDueDate,
      is_completed: task.is_completed ? 1 : 0
    };

    try {
      const res = await apiRequest('api.php?action=update', 'POST', payload);
      if (res && res.success) {
        showToast(`実施日を ${dateStr} に変更しました！`, 'success');
        await refreshAll();
      }
    } catch (err) {
      // エラー処理は apiRequest 内で統一実行
    }
  }

  /**
   * 標準リスト表示用の単一タスクカード DOM 要素を生成します。
   * @param {Object} task - タスクオブジェクト
   * @returns {HTMLElement} 生成されたタスクカード要素
   */
  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority} ${task.is_completed ? 'completed' : ''}`;
    card.dataset.id = task.id;

    // 優先度バッジ用テキスト設定
    const priorityLabels = { high: '優先度: 高', medium: '優先度: 中', low: '優先度: 低' };
    const priorityClass = `badge-priority-${task.priority}`;

    // 期限日時バッジ用フォーマット取得
    let dueBadgeHtml = '';
    if (task.due_date) {
      const { label, className } = formatDueDate(task.due_date, task.is_completed);
      dueBadgeHtml = `<span class="badge badge-due ${className}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${label}
      </span>`;
    }

    // カテゴリバッジ HTML
    const categoryBadge = `<span class="badge badge-category">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
      ${escapeHtml(task.category)}
    </span>`;

    card.innerHTML = `
      <label class="custom-checkbox" title="${task.is_completed ? '未完了に戻す' : '完了にする'}">
        <input type="checkbox" ${task.is_completed ? 'checked' : ''} class="task-checkbox">
        <span class="checkmark">
          <svg class="checkmark-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </span>
      </label>

      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          ${categoryBadge}
          <span class="badge ${priorityClass}">${priorityLabels[task.priority]}</span>
          ${dueBadgeHtml}
        </div>
      </div>

      <div class="task-actions">
        <button class="action-btn btn-edit" title="編集">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </button>
        <button class="action-btn btn-delete" title="削除">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    // タスクカード内の各操作要素にイベントリスナーを設定
    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const editBtn = card.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => openEditModal(task));

    const deleteBtn = card.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    return card;
  }

  // --------------------------------------------------------------------------
  // 6. 日付フォーマットおよび HTML エスケープ用ヘルパー関数
  // --------------------------------------------------------------------------
  /**
   * 期限日時文字列を相対形式（「今日 18:00」「明日 10:00」「期限切れ (2日前)」など）にフォーマットします。
   * @param {string} dueDateStr - 期限日時文字列 (YYYY-MM-DD HH:mm:ss)
   * @param {boolean} isCompleted - 完了済みフラグ
   * @returns {{label: string, className: string}} 表示ラベルと適用するCSSクラス名
   */
  function formatDueDate(dueDateStr, isCompleted) {
    const due = new Date(dueDateStr.replace(' ', 'T'));
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDayStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffDays = Math.round((dueDayStart - todayStart) / (1000 * 60 * 60 * 24));

    const hours = String(due.getHours()).padStart(2, '0');
    const minutes = String(due.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    let label = '';
    let className = '';

    if (diffDays < 0) {
      label = `期限切れ (${Math.abs(diffDays)}日前)`;
      className = isCompleted ? '' : 'overdue';
    } else if (diffDays === 0) {
      label = `今日 ${timeStr}`;
      className = isCompleted ? '' : 'today';
    } else if (diffDays === 1) {
      label = `明日 ${timeStr}`;
    } else {
      const month = due.getMonth() + 1;
      const day = due.getDate();
      label = `${month}/${day} ${timeStr}`;
    }

    return { label, className };
  }

  /**
   * XSS (クロスサイトスクリプティング) 対策用 HTML エスケープ処理
   * @param {string} str - エスケープ対象の文字列
   * @returns {string} サニタイズされた安全な HTML 文字列
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --------------------------------------------------------------------------
  // 7. タスク操作（新規作成・完了切替・更新・削除・完了済み一括削除）
  // --------------------------------------------------------------------------
  // 新規タスク送信フォームの submit イベント処理
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return;

    const payload = {
      title,
      category: taskCategorySelect.value,
      priority: taskPrioritySelect.value,
      due_date: taskDueDateInput.value || null,
      description: taskDescInput.value.trim() || null
    };

    try {
      const res = await apiRequest('api.php?action=create', 'POST', payload);
      if (res && res.success) {
        showToast('タスクを追加しました！', 'success');
        taskTitleInput.value = '';
        taskDescInput.value = '';
        taskDueDateInput.value = '';
        if (detailsExtra.classList.contains('show')) {
          detailsExtra.classList.remove('show');
          toggleDetailsBtn.innerHTML = `詳細を追加 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        }
        await refreshAll();
      }
    } catch (err) {
      // トースト通知は apiRequest 内で表示
    }
  });

  /**
   * タスクの完了・未完了ステータスをトグル（切替）送信します。
   * @param {number} id - タスクID
   */
  async function toggleTaskCompletion(id) {
    try {
      const res = await apiRequest('api.php?action=toggle', 'POST', { id });
      if (res && res.success) {
        showToast(res.message, 'info');
        await refreshAll();
      }
    } catch (err) {
      await fetchTasks(); // エラー時はチェックボックスの表示を元の状態にロールバック
    }
  }

  /**
   * 指定したタスクを削除します（確認ダイアログ付き）。
   * @param {number} id - タスクID
   */
  async function deleteTask(id) {
    if (!confirm('このタスクを削除してもよろしいですか？')) return;
    try {
      const res = await apiRequest('api.php?action=delete', 'POST', { id });
      if (res && res.success) {
        showToast('タスクを削除しました。', 'info');
        await refreshAll();
      }
    } catch (err) {
      // エラー処理は apiRequest 内で統一実行
    }
  }

  // 完了済みタスクの一括削除処理
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', async () => {
      if (!confirm('完了済みのタスクをすべて削除しますか？')) return;
      try {
        const res = await apiRequest('api.php?action=clear_completed', 'POST', {});
        if (res && res.success) {
          showToast(res.message, 'success');
          await refreshAll();
        }
      } catch (err) {
        // エラー処理は apiRequest 内で統一実行
      }
    });
  }

  // --------------------------------------------------------------------------
  // 8. タスク編集用モーダルダイアログの制御
  // --------------------------------------------------------------------------
  /**
   * モーダルダイアログを開き、対象タスクの現在値を入力フォームにセットします。
   * @param {Object} task - 編集対象のタスクデータ
   */
  function openEditModal(task) {
    editTaskId.value = task.id;
    editTitle.value = task.title;
    editDescription.value = task.description || '';
    editCategory.value = task.category;
    editPriority.value = task.priority;
    editCompleted.checked = task.is_completed;

    if (task.due_date) {
      // datetime-local 入力用に YYYY-MM-DDTHH:mm 形式へフォーマット変換
      const date = new Date(task.due_date.replace(' ', 'T'));
      const pad = (n) => String(n).padStart(2, '0');
      editDueDate.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } else {
      editDueDate.value = '';
    }

    editModal.showModal();
  }

  /**
   * モーダルダイアログを閉じます。
   */
  function closeEditModal() {
    editModal.close();
  }

  closeEditModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  // モーダル編集フォームの submit イベント処理
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(editTaskId.value, 10);
    const title = editTitle.value.trim();
    if (!title) return;

    const payload = {
      id,
      title,
      description: editDescription.value.trim() || null,
      category: editCategory.value,
      priority: editPriority.value,
      due_date: editDueDate.value || null,
      is_completed: editCompleted.checked ? 1 : 0
    };

    try {
      const res = await apiRequest('api.php?action=update', 'POST', payload);
      if (res && res.success) {
        showToast('タスクを更新しました。', 'success');
        closeEditModal();
        await refreshAll();
      }
    } catch (err) {
      // エラー処理は apiRequest 内で統一実行
    }
  });

  // --------------------------------------------------------------------------
  // 9. フィルター・検索・並び替え機能のイベントリスナー設定
  // --------------------------------------------------------------------------
  // ステータスフィルターピル（すべて/未完了/完了済み/今日/期限切れ）クリック時
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.dataset.filter;
      fetchTasks();
    });
  });

  // カテゴリ絞り込みドロップダウン変更時
  filterCategorySelect.addEventListener('change', () => {
    state.category = filterCategorySelect.value;
    fetchTasks();
  });

  // 優先度絞り込みドロップダウン変更時
  filterPrioritySelect.addEventListener('change', () => {
    state.priority = filterPrioritySelect.value;
    fetchTasks();
  });

  // ソート順ドロップダウン変更時
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    fetchTasks();
  });

  // 検索入力欄のデバウンス処理（タイピング停止後 300ms で自動検索リクエスト発火）
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    state.searchQuery = val;
    clearSearchBtn.classList.toggle('show', val.length > 0);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchTasks();
    }, 300);
  });

  // 検索クリア「✕」ボタンクリック時
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.remove('show');
    fetchTasks();
  });

  // 新規登録フォームの詳細入力領域の展開/折りたたみ切替
  if (toggleDetailsBtn) {
    toggleDetailsBtn.addEventListener('click', () => {
      const isShowing = detailsExtra.classList.toggle('show');
      toggleDetailsBtn.innerHTML = isShowing
        ? `詳細を閉じる <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`
        : `詳細を追加 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    });
  }

  // --------------------------------------------------------------------------
  // 9b. 表示モード切替およびスケジュール日付ナビゲーションのイベントリスナー
  // --------------------------------------------------------------------------
  // リスト表示 / スケジュール表示 切替ボタン
  if (viewModeListBtn && viewModeScheduleBtn) {
    viewModeListBtn.addEventListener('click', () => {
      state.viewMode = 'list';
      viewModeListBtn.classList.add('active');
      viewModeScheduleBtn.classList.remove('active');
      renderTasks();
    });

    viewModeScheduleBtn.addEventListener('click', () => {
      state.viewMode = 'schedule';
      viewModeScheduleBtn.classList.add('active');
      viewModeListBtn.classList.remove('active');
      renderTasks();
    });
  }

  // 前の週へ移動 (-7日)
  if (schedPrevWeekBtn) {
    schedPrevWeekBtn.addEventListener('click', () => {
      state.scheduleOffsetDays -= 7;
      renderScheduleView();
    });
  }

  // 次の週へ移動 (+7日)
  if (schedNextWeekBtn) {
    schedNextWeekBtn.addEventListener('click', () => {
      state.scheduleOffsetDays += 7;
      renderScheduleView();
    });
  }

  // 今週（今日）に移動 (オフセット 0 にリセット)
  if (schedTodayBtn) {
    schedTodayBtn.addEventListener('click', () => {
      state.scheduleOffsetDays = 0;
      renderScheduleView();
    });
  }

  // --------------------------------------------------------------------------
  // 10. グローバルキーボードショートカット＆一括データ再取得
  // --------------------------------------------------------------------------
  // キーボードの '/' キー押下時に検索入力欄へフォーカス移動（テキスト入力中でない場合）
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /**
   * カテゴリ・統計・タスク一覧の全データを一括取得して画面を最新状態に更新します。
   */
  async function refreshAll() {
    await Promise.all([fetchCategories(), fetchStats(), fetchTasks()]);
  }

  // --------------------------------------------------------------------------
  // アプリケーション初期化実行
  // --------------------------------------------------------------------------
  initTheme();   // テーマの設定
  refreshAll();  // 初回の全データ取得およびレンダリング
});
