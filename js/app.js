// ============================================================
//  To-Do App — app.js
//  Pure Vanilla JS + localStorage
// ============================================================

'use strict';

// ========== Constants ==========
const STORAGE_KEY = 'todo_app_tasks';
const THEME_KEY   = 'todo_app_theme';
const CATEGORIES  = ['Personal', 'Work', 'Study', 'Shopping', 'Health', 'Other'];
const PRIORITIES  = ['low', 'medium', 'high'];

// ========== State ==========
let tasks       = [];
let filter      = { status: 'all', category: '', priority: '', query: '' };
let sortBy      = 'created_desc';
let editingId   = null;

// ========== DOM refs ==========
const $ = id => document.getElementById(id);

const els = {
  taskInput:        $('taskInput'),
  categorySelect:   $('categorySelect'),
  prioritySelect:   $('prioritySelect'),
  dueDateInput:     $('dueDateInput'),
  addBtn:           $('addBtn'),
  taskList:         $('taskList'),
  emptyState:       $('emptyState'),
  searchInput:      $('searchInput'),
  searchClear:      $('searchClear'),
  themeToggle:      $('themeToggle'),
  tabAll:           $('tabAll'),
  tabActive:        $('tabActive'),
  tabCompleted:     $('tabCompleted'),
  tabAllCount:      $('tabAllCount'),
  tabActiveCount:   $('tabActiveCount'),
  tabCompletedCount: $('tabCompletedCount'),
  sortSelect:       $('sortSelect'),
  progressFill:     $('progressFill'),
  progressLabel:    $('progressLabel'),
  statTotal:        $('statTotal'),
  statDone:         $('statDone'),
  statLeft:         $('statLeft'),
  headerDate:       $('headerDate'),
  bulkBar:          $('bulkBar'),
  bulkCount:        $('bulkCount'),
  clearCompletedBtn: $('clearCompletedBtn'),
  exportBtn:        $('exportBtn'),
  importInput:      $('importInput'),
  confirmModal:     $('confirmModal'),
  confirmTitle:     $('confirmTitle'),
  confirmMsg:       $('confirmMsg'),
  confirmOk:        $('confirmOk'),
  confirmCancel:    $('confirmCancel'),
  toast:            $('toast'),
  filterChips:      document.querySelectorAll('[data-category]'),
  priorityChips:    document.querySelectorAll('[data-priority]'),
};

// ========== Storage ==========
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : getDefaultTasks();
  } catch {
    tasks = getDefaultTasks();
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getDefaultTasks() {
  return [
    {
      id: genId(),
      title: 'Welcome to your To-Do app! 🎉',
      completed: false,
      priority: 'low',
      category: 'Personal',
      dueDate: '',
      createdAt: Date.now(),
    },
    {
      id: genId(),
      title: 'Try adding a new task above',
      completed: false,
      priority: 'medium',
      category: 'Work',
      dueDate: todayStr(),
      createdAt: Date.now() - 1000,
    },
    {
      id: genId(),
      title: 'Check off this task ✅',
      completed: true,
      priority: 'high',
      category: 'Personal',
      dueDate: '',
      createdAt: Date.now() - 2000,
    },
  ];
}

// ========== Utilities ==========
function genId() {
  return '_' + Math.random().toString(36).slice(2, 11);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dueDateClass(dateStr) {
  if (!dateStr) return '';
  const today = todayStr();
  if (dateStr < today) return 'overdue';
  if (dateStr === today) return 'today';
  return '';
}

function dueDateLabel(dateStr) {
  if (!dateStr) return '';
  const today = todayStr();
  if (dateStr < today) return '⚠️ ' + formatDate(dateStr);
  if (dateStr === today) return '📅 Today';
  return '📅 ' + formatDate(dateStr);
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ========== Theme ==========
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ========== Header Date ==========
function updateDate() {
  const now = new Date();
  els.headerDate.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });
}

// ========== Task CRUD ==========
function addTask() {
  const title = els.taskInput.value.trim();
  if (!title) {
    els.taskInput.focus();
    shakeInput();
    return;
  }

  const task = {
    id:        genId(),
    title,
    completed: false,
    priority:  els.prioritySelect.value,
    category:  els.categorySelect.value,
    dueDate:   els.dueDateInput.value,
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  saveTasks();

  // Reset form
  els.taskInput.value    = '';
  els.dueDateInput.value = '';
  els.taskInput.focus();

  renderAll();
  showToast('Task added ✓');
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  renderAll();
}

function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderAll();
    }, 250);
  }
}

function startEdit(id) {
  if (editingId === id) return;
  cancelEdit();
  editingId = id;

  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return;
  const titleEl = card.querySelector('.task-title-text');
  const editEl  = card.querySelector('.task-title-edit');
  const task    = tasks.find(t => t.id === id);

  titleEl.classList.add('editing');
  editEl.classList.add('editing');
  editEl.value = task.title;
  editEl.focus();
  editEl.select();
}

function cancelEdit() {
  if (!editingId) return;
  const card = document.querySelector(`[data-id="${editingId}"]`);
  if (card) {
    card.querySelector('.task-title-text').classList.remove('editing');
    card.querySelector('.task-title-edit').classList.remove('editing');
  }
  editingId = null;
}

function saveEdit(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (!card) return;
  const editEl = card.querySelector('.task-title-edit');
  const newTitle = editEl.value.trim();
  if (!newTitle) { cancelEdit(); return; }

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.title = newTitle;
    saveTasks();
  }
  cancelEdit();
  renderAll();
}

function clearCompleted() {
  showConfirm(
    'Clear completed tasks?',
    'All completed tasks will be permanently removed.',
    () => {
      const removing = tasks.filter(t => t.completed).map(t => t.id);
      removing.forEach(id => {
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) card.classList.add('removing');
      });
      setTimeout(() => {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderAll();
        showToast('Cleared ✓');
      }, 250);
    }
  );
}

// ========== Filtering & Sorting ==========
function getFilteredTasks() {
  let result = [...tasks];

  // Status
  if (filter.status === 'active')    result = result.filter(t => !t.completed);
  if (filter.status === 'completed') result = result.filter(t =>  t.completed);

  // Category
  if (filter.category) result = result.filter(t => t.category === filter.category);

  // Priority
  if (filter.priority) result = result.filter(t => t.priority === filter.priority);

  // Search
  if (filter.query) {
    const q = filter.query.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }

  // Sort
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  switch (sortBy) {
    case 'created_desc': result.sort((a,b) => b.createdAt - a.createdAt); break;
    case 'created_asc':  result.sort((a,b) => a.createdAt - b.createdAt); break;
    case 'priority':     result.sort((a,b) => priorityOrder[a.priority] - priorityOrder[b.priority]); break;
    case 'due':          result.sort((a,b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }); break;
    case 'alpha':        result.sort((a,b) => a.title.localeCompare(b.title)); break;
  }

  return result;
}

// ========== Render ==========
function renderAll() {
  updateStats();
  updateTabs();
  renderTasks();
  updateBulkBar();
}

function updateStats() {
  const total     = tasks.length;
  const done      = tasks.filter(t => t.completed).length;
  const left      = total - done;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  els.statTotal.textContent   = total;
  els.statDone.textContent    = done;
  els.statLeft.textContent    = left;
  els.progressFill.style.width = pct + '%';
  els.progressLabel.textContent = pct + '%';
}

function updateTabs() {
  const all       = tasks.length;
  const active    = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t =>  t.completed).length;

  els.tabAllCount.textContent       = all;
  els.tabActiveCount.textContent    = active;
  els.tabCompletedCount.textContent = completed;

  [els.tabAll, els.tabActive, els.tabCompleted].forEach(btn => btn.classList.remove('active'));
  if      (filter.status === 'all')       els.tabAll.classList.add('active');
  else if (filter.status === 'active')    els.tabActive.classList.add('active');
  else if (filter.status === 'completed') els.tabCompleted.classList.add('active');
}

function renderTasks() {
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    els.taskList.innerHTML = '';
    els.emptyState.classList.add('visible');
    return;
  }

  els.emptyState.classList.remove('visible');
  els.taskList.innerHTML = filtered.map(task => renderTaskCard(task)).join('');

  // Re-attach edit listeners
  els.taskList.querySelectorAll('.task-title-edit').forEach(el => {
    const id = el.closest('[data-id]').dataset.id;
    el.addEventListener('blur',    () => saveEdit(id));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter')  saveEdit(id);
      if (e.key === 'Escape') cancelEdit();
    });
  });
}

function renderTaskCard(task) {
  const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  const dueClass  = dueDateClass(task.dueDate);
  const dueLabel  = dueDateLabel(task.dueDate);
  const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';

  return `
  <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
    <button class="task-checkbox" onclick="toggleTask('${task.id}')" aria-label="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
      <span class="checkmark">✓</span>
    </button>
    <div class="task-body">
      <span class="task-title-text">${escHtml(task.title)}</span>
      <input class="task-title-edit" type="text" value="${escHtml(task.title)}" aria-label="Edit task title">
      <div class="task-meta">
        <span class="badge badge-category">📁 ${escHtml(task.category)}</span>
        <span class="badge badge-${task.priority}">${priorityIcon} ${priorityLabel}</span>
        ${dueLabel ? `<span class="badge badge-due ${dueClass}">${dueLabel}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action-btn edit" onclick="startEdit('${task.id}')" title="Edit">✏️</button>
      <button class="task-action-btn delete" onclick="deleteTask('${task.id}')" title="Delete">🗑️</button>
    </div>
  </div>`;
}

function updateBulkBar() {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount > 0) {
    els.bulkCount.textContent = `${completedCount} completed`;
    els.bulkBar.classList.add('visible');
  } else {
    els.bulkBar.classList.remove('visible');
  }
}

// ========== Input shake ==========
function shakeInput() {
  els.taskInput.style.animation = 'none';
  els.taskInput.offsetHeight; // reflow
  els.taskInput.style.animation = 'shake 0.4s ease';
}

// ========== Toast ==========
let toastTimer;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

// ========== Confirm Modal ==========
let confirmCallback = null;

function showConfirm(title, msg, callback) {
  els.confirmTitle.textContent = title;
  els.confirmMsg.textContent   = msg;
  confirmCallback = callback;
  els.confirmModal.classList.add('open');
}

function closeConfirm() {
  els.confirmModal.classList.remove('open');
  confirmCallback = null;
}

// ========== Export / Import ==========
function exportTasks() {
  const data = JSON.stringify(tasks, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'my-tasks.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Tasks exported ✓');
}

function importTasks(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error();
      tasks = imported;
      saveTasks();
      renderAll();
      showToast(`Imported ${imported.length} tasks ✓`);
    } catch {
      showToast('⚠️ Invalid file format');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ========== Event Listeners ==========
function initEvents() {
  // Add task
  els.addBtn.addEventListener('click', addTask);
  els.taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  // Theme
  els.themeToggle.addEventListener('click', toggleTheme);

  // Search
  els.searchInput.addEventListener('input', e => {
    filter.query = e.target.value.trim();
    els.searchClear.classList.toggle('visible', !!filter.query);
    renderAll();
  });
  els.searchClear.addEventListener('click', () => {
    els.searchInput.value = '';
    filter.query = '';
    els.searchClear.classList.remove('visible');
    renderAll();
  });

  // Status tabs
  els.tabAll.addEventListener('click', ()       => { filter.status = 'all';       renderAll(); });
  els.tabActive.addEventListener('click', ()    => { filter.status = 'active';    renderAll(); });
  els.tabCompleted.addEventListener('click', () => { filter.status = 'completed'; renderAll(); });

  // Category chips
  document.querySelectorAll('[data-category]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.dataset.category;
      filter.category = filter.category === val ? '' : val;
      document.querySelectorAll('[data-category]').forEach(c => c.classList.toggle('active', c.dataset.category === filter.category));
      renderAll();
    });
  });

  // Priority chips
  document.querySelectorAll('[data-priority]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.dataset.priority;
      filter.priority = filter.priority === val ? '' : val;
      document.querySelectorAll('[data-priority]').forEach(c => c.classList.toggle('active', c.dataset.priority === filter.priority));
      renderAll();
    });
  });

  // Sort
  els.sortSelect.addEventListener('change', e => { sortBy = e.target.value; renderAll(); });

  // Clear completed
  els.clearCompletedBtn.addEventListener('click', clearCompleted);

  // Export / Import
  els.exportBtn.addEventListener('click', exportTasks);
  els.importInput.addEventListener('change', importTasks);

  // Confirm modal
  els.confirmOk.addEventListener('click', () => { if (confirmCallback) confirmCallback(); closeConfirm(); });
  els.confirmCancel.addEventListener('click', closeConfirm);
  els.confirmModal.addEventListener('click', e => { if (e.target === els.confirmModal) closeConfirm(); });

  // Close edit on outside click
  document.addEventListener('click', e => {
    if (editingId && !e.target.closest(`[data-id="${editingId}"]`)) cancelEdit();
  });
}

// ========== Add shake keyframe dynamically ==========
function addShakeKeyframe() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }`;
  document.head.appendChild(style);
}

// ========== Init ==========
function init() {
  loadTasks();
  initTheme();
  updateDate();
  addShakeKeyframe();
  initEvents();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
