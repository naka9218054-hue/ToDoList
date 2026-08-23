/**
 * ToDoList Application - Modern Vanilla JS
 * Handles UI interactions, Fetch API calls, state, and rendering
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    filter: 'all',          // all | active | completed | today | overdue
    category: 'all',
    priority: 'all',
    sort: 'created_desc',
    searchQuery: '',
    categories: [],
    tasks: []
  };

  // DOM Elements
  const themeToggleBtn = document.getElementById('theme-toggle');
  const taskForm = document.getElementById('task-form');
  const taskTitleInput = document.getElementById('task-title-input');
  const taskCategorySelect = document.getElementById('task-category-select');
  const taskPrioritySelect = document.getElementById('task-priority-select');
  const taskDueDateInput = document.getElementById('task-due-date-input');
  const taskDescInput = document.getElementById('task-desc-input');
  const toggleDetailsBtn = document.getElementById('toggle-details-btn');
  const detailsExtra = document.getElementById('details-extra');

  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const filterPills = document.querySelectorAll('.pill-btn');
  const filterCategorySelect = document.getElementById('filter-category-select');
  const filterPrioritySelect = document.getElementById('filter-priority-select');
  const sortSelect = document.getElementById('sort-select');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');

  const taskListContainer = document.getElementById('task-list-container');
  const emptyState = document.getElementById('empty-state');

  // Stats Elements
  const statTotal = document.getElementById('stat-total');
  const statActive = document.getElementById('stat-active');
  const statCompleted = document.getElementById('stat-completed');
  const statOverdue = document.getElementById('stat-overdue');
  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');

  // Edit Modal Elements
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');
  const editTaskId = document.getElementById('edit-task-id');
  const editTitle = document.getElementById('edit-task-title');
  const editDescription = document.getElementById('edit-task-desc');
  const editCategory = document.getElementById('edit-task-category');
  const editPriority = document.getElementById('edit-task-priority');
  const editDueDate = document.getElementById('edit-task-due-date');
  const editCompleted = document.getElementById('edit-task-completed');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // DB Error Alert Banner
  const dbAlertBanner = document.getElementById('db-alert-banner');
  const dbErrorMessage = document.getElementById('db-error-message');

  // --------------------------------------------------------------------------
  // 1. Theme Management
  // --------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('todo_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('todo_theme', theme);
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === 'dark' 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  // --------------------------------------------------------------------------
  // 2. Toast Notifications
  // --------------------------------------------------------------------------
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

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3000);
  }

  // --------------------------------------------------------------------------
  // 3. API Communication Helper
  // --------------------------------------------------------------------------
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
        if (json.hint && dbAlertBanner && dbErrorMessage) {
          dbErrorMessage.innerText = `${json.error || 'エラー'} (${json.hint})`;
          dbAlertBanner.style.display = 'block';
        }
        throw new Error(json.error || 'リクエストの処理中にエラーが発生しました。');
      }

      if (dbAlertBanner) dbAlertBanner.style.display = 'none';
      return json;
    } catch (err) {
      console.error('API Error:', err);
      showToast(err.message, 'error');
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // 4. Data Loading & Stats
  // --------------------------------------------------------------------------
  async function fetchCategories() {
    try {
      const res = await apiRequest('api.php?action=categories');
      if (res && res.data) {
        state.categories = res.data;
        renderCategoryOptions();
      }
    } catch (e) {
      // Handled in apiRequest
    }
  }

  function renderCategoryOptions() {
    const defaultOptions = ['一般', '仕事', 'プライベート', '買い物', '学習', '健康'];
    const currentList = state.categories.length ? state.categories.map(c => c.name) : defaultOptions;
    
    // Quick Add Select
    const currentSelected = taskCategorySelect.value;
    taskCategorySelect.innerHTML = currentList.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (currentList.includes(currentSelected)) taskCategorySelect.value = currentSelected;

    // Filter Select
    filterCategorySelect.innerHTML = `<option value="all">すべてのカテゴリ</option>` +
      currentList.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (state.category !== 'all') filterCategorySelect.value = state.category;

    // Modal Select
    editCategory.innerHTML = currentList.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
  }

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
      // Handled in apiRequest
    }
  }

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
      // Handled in apiRequest
    }
  }

  // --------------------------------------------------------------------------
  // 5. Task List Rendering
  // --------------------------------------------------------------------------
  function renderTasks() {
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

  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority} ${task.is_completed ? 'completed' : ''}`;
    card.dataset.id = task.id;

    // Priority badge text
    const priorityLabels = { high: '優先度: 高', medium: '優先度: 中', low: '優先度: 低' };
    const priorityClass = `badge-priority-${task.priority}`;

    // Due date badge formatting
    let dueBadgeHtml = '';
    if (task.due_date) {
      const { label, className } = formatDueDate(task.due_date, task.is_completed);
      dueBadgeHtml = `<span class="badge badge-due ${className}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${label}
      </span>`;
    }

    // Category badge
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

    // Event Listeners for Card
    const checkbox = card.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const editBtn = card.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => openEditModal(task));

    const deleteBtn = card.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    return card;
  }

  // --------------------------------------------------------------------------
  // 6. Date Formatting Helper
  // --------------------------------------------------------------------------
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

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --------------------------------------------------------------------------
  // 7. Actions (Create, Toggle, Update, Delete)
  // --------------------------------------------------------------------------
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
      // Toast displayed in apiRequest
    }
  });

  async function toggleTaskCompletion(id) {
    try {
      const res = await apiRequest('api.php?action=toggle', 'POST', { id });
      if (res && res.success) {
        showToast(res.message, 'info');
        await refreshAll();
      }
    } catch (err) {
      await fetchTasks(); // rollback checkbox visually
    }
  }

  async function deleteTask(id) {
    if (!confirm('このタスクを削除してもよろしいですか？')) return;
    try {
      const res = await apiRequest('api.php?action=delete', 'POST', { id });
      if (res && res.success) {
        showToast('タスクを削除しました。', 'info');
        await refreshAll();
      }
    } catch (err) {
      // handled
    }
  }

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
        // handled
      }
    });
  }

  // --------------------------------------------------------------------------
  // 8. Edit Modal
  // --------------------------------------------------------------------------
  function openEditModal(task) {
    editTaskId.value = task.id;
    editTitle.value = task.title;
    editDescription.value = task.description || '';
    editCategory.value = task.category;
    editPriority.value = task.priority;
    editCompleted.checked = task.is_completed;

    if (task.due_date) {
      // Format as YYYY-MM-DDTHH:mm for datetime-local
      const date = new Date(task.due_date.replace(' ', 'T'));
      const pad = (n) => String(n).padStart(2, '0');
      editDueDate.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } else {
      editDueDate.value = '';
    }

    editModal.showModal();
  }

  function closeEditModal() {
    editModal.close();
  }

  closeEditModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

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
      // handled
    }
  });

  // --------------------------------------------------------------------------
  // 9. Filters, Search & Sorting
  // --------------------------------------------------------------------------
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filter = pill.dataset.filter;
      fetchTasks();
    });
  });

  filterCategorySelect.addEventListener('change', () => {
    state.category = filterCategorySelect.value;
    fetchTasks();
  });

  filterPrioritySelect.addEventListener('change', () => {
    state.priority = filterPrioritySelect.value;
    fetchTasks();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    fetchTasks();
  });

  // Debounced Search
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

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.remove('show');
    fetchTasks();
  });

  // Toggle quick add notes/due date expansion
  if (toggleDetailsBtn) {
    toggleDetailsBtn.addEventListener('click', () => {
      const isShowing = detailsExtra.classList.toggle('show');
      toggleDetailsBtn.innerHTML = isShowing 
        ? `詳細を閉じる <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`
        : `詳細を追加 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    });
  }

  // --------------------------------------------------------------------------
  // 10. Global Shortcuts & Refresh
  // --------------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    // Focus search on '/' when not in input
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  async function refreshAll() {
    await Promise.all([fetchCategories(), fetchStats(), fetchTasks()]);
  }

  // Initialize
  initTheme();
  refreshAll();
});

