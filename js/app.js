/* ═══════════════════════════════════════════
   APP.JS — Lógica principal de tareas
   ═══════════════════════════════════════════ */

let tasks = [];
let appState = { focus: 'hoy', company: 'all', client: 'all', priority: 'all', person: 'all' };
let editingTaskId = null;
const PO = { alta: 0, media: 1, baja: 2 };

/* ─── Screens ─── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

/* ─── Recurring tasks reset ─── */
function checkRecurring() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayDay = today.getDay();
  let changed = false;
  tasks.forEach(t => {
    if (!t.recurrence) return;
    if (t.lastReset === todayStr) return;
    let matches = false;
    if (t.recurrence === 'daily') matches = true;
    else if (t.recurrence.startsWith('weekly:')) {
      matches = todayDay === parseInt(t.recurrence.split(':')[1]);
    }
    if (matches) {
      t.done = false;
      t.skipped = false;
      t.doneAt = null;
      t.focus = 'hoy';
      t.lastReset = todayStr;
      changed = true;
    }
  });
  if (changed) saveTasks(tasks);
}

/* ─── Boot ─── */
function bootApp() {
  tasks = loadTasks();
  checkRecurring();
  showScreen('app');
  setupSidebar();
  setupDate();
  setupOnline();
  render();
  renderActivity();

  document.getElementById('modal-task').addEventListener('click', function(e) {
    if (e.target === this) closeTaskModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeTaskModal();
  });

  bc.onmessage = (e) => {
    if (e.data.type === 'sync') { tasks = loadTasks(); render(); }
    if (e.data.type === 'activity') renderActivity();
  };
}

/* ─── Sidebar ─── */
function setupSidebar() {
  document.getElementById('current-user-badge').innerHTML =
    `<span class="cu-name">${esc(currentUser.displayName)}</span>`;

  if (isAdmin()) document.getElementById('admin-btn').style.display = 'flex';

  const coNav = document.getElementById('company-nav');
  const accessibleCos = Object.entries(COMPANIES).filter(([k]) => canSee(k));

  let coHtml = '';
  if (accessibleCos.length > 1) {
    coHtml += `<button class="snav active-co" data-co="all" onclick="setCompany('all',this)">
      <span class="sico" style="color:#FF4D00">◈</span> Todas
    </button>`;
  }
  accessibleCos.forEach(([key, co]) => {
    coHtml += `<button class="snav" data-co="${key}" onclick="setCompany('${key}',this)">
      <span class="co-dot" style="background:${co.color}"></span> ${co.name}
    </button>`;
  });
  coNav.innerHTML = coHtml;

  if (accessibleCos.length === 1) {
    appState.company = accessibleCos[0][0];
    coNav.querySelector('.snav').classList.add('active-co');
  }

  if (isAdmin()) {
    document.getElementById('person-section').style.display = 'flex';
    renderPersonNav();
  }
}

function renderPersonNav() {
  const users = loadUsers();
  const nav = document.getElementById('person-nav');
  let html = `<button class="snav active-co" data-person="all" onclick="setPerson('all',this)">
    <span class="sico">◈</span> Todos
  </button>`;
  users.forEach(u => {
    html += `<button class="snav" data-person="${esc(u.id)}" onclick='setPerson(${JSON.stringify(u.displayName)},this)'>
      <span class="sico" style="font-size:9px">●</span> ${esc(u.displayName)}
    </button>`;
  });
  nav.innerHTML = html;
}

function setPerson(p, btn) {
  appState.person = p;
  document.querySelectorAll('.snav[data-person]').forEach(b => b.classList.remove('active-co'));
  btn.classList.add('active-co');
  render();
}

/* ─── Date ─── */
function setupDate() {
  const d = new Date();
  const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const h = d.getHours();
  const greet = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('header-greeting').textContent = `${greet}, ${currentUser.displayName.split(' ')[0]}`;
  document.getElementById('header-date').textContent =
    `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/* ─── Online users ─── */
function setupOnline() {
  const key = 'gruntt_online_v3';
  const mark = () => {
    const o = JSON.parse(localStorage.getItem(key)||'{}');
    o[currentUser.displayName] = Date.now();
    localStorage.setItem(key, JSON.stringify(o));
    bc.postMessage({ type: 'online' });
    renderOnline();
  };
  mark();
  setInterval(mark, 60000);
  bc.addEventListener('message', e => { if (e.data.type === 'online') renderOnline(); });
}

function renderOnline() {
  const key = 'gruntt_online_v3';
  const o = JSON.parse(localStorage.getItem(key)||'{}');
  const now = Date.now();
  const active = Object.entries(o).filter(([,t]) => now - t < 5*60*1000).map(([n]) => n);
  const el = document.getElementById('online-users-el');
  el.innerHTML = active.length > 0
    ? `<div class="online-label">En línea</div>` + active.map(n =>
        `<span class="online-pill"><span class="online-dot"></span>${esc(n)}</span>`).join('')
    : '';
}

/* ─── Filtros sidebar ─── */
function setFocus(f, btn) {
  appState.focus = f;
  document.querySelectorAll('.snav[data-focus]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function setCompany(co, btn) {
  appState.company = co;
  appState.client = 'all';
  document.querySelectorAll('.snav[data-co]').forEach(b => b.classList.remove('active-co'));
  btn.classList.add('active-co');
  const clientSection = document.getElementById('client-section');
  if (co === 'mnd') {
    clientSection.style.display = 'block';
    renderClientNav();
  } else {
    clientSection.style.display = 'none';
  }
  render();
}

function setClient(client, btn) {
  appState.client = client;
  document.querySelectorAll('.snav[data-client]').forEach(b => b.classList.remove('active-co'));
  btn.classList.add('active-co');
  render();
}

function renderClientNav() {
  const nav = document.getElementById('client-nav');
  const clients = ['all', ...MND_CLIENTS.slice(1)];
  nav.innerHTML = clients.map(c => `
    <button class="snav ${appState.client===c?'active-co':''}" data-client="${c}" onclick="setClient('${c.replace(/'/g,"\\'")}',this)">
      <span class="sico" style="font-size:8px">◆</span> ${c === 'all' ? 'Todos' : esc(c)}
    </button>
  `).join('');
}

/* ─── Filtro de prioridad (barra sobre lista) ─── */
function setPriorityFilter(p, btn) {
  appState.priority = p;
  document.querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

/* ─── Modal nueva tarea / editar tarea ─── */
function openTaskModal() {
  editingTaskId = null;
  document.getElementById('modal-title').textContent = 'Nueva tarea';
  document.getElementById('modal-submit-btn').textContent = 'Crear tarea';

  const mCo = document.getElementById('m-co');
  const accessibleCos = Object.entries(COMPANIES).filter(([k]) => canSee(k));
  mCo.innerHTML = accessibleCos.map(([k,co]) => `<option value="${k}">${co.name}</option>`).join('');
  updateModalClient();

  document.getElementById('m-title').value = '';
  document.getElementById('m-priority').value = 'alta';
  document.getElementById('m-focus').value = appState.focus === 'backlog' ? 'backlog' : appState.focus === 'semana' ? 'semana' : 'hoy';
  document.getElementById('m-due').value = '';
  document.getElementById('m-recurrence').value = '';
  document.getElementById('m-notes').value = '';
  document.getElementById('m-error').style.display = 'none';

  const assigneeWrap = document.getElementById('m-assignee-wrap');
  if (isAdmin()) {
    const users = loadUsers();
    const sel = document.getElementById('m-assignee');
    sel.innerHTML = users.map(u =>
      `<option value="${esc(u.displayName)}" ${u.id === currentUser.id ? 'selected' : ''}>${esc(u.displayName)}</option>`
    ).join('');
    assigneeWrap.style.display = 'block';
  } else {
    assigneeWrap.style.display = 'none';
  }

  document.getElementById('modal-task').style.display = 'flex';
  setTimeout(() => document.getElementById('m-title').focus(), 60);
}

function openEditTaskModal(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('modal-title').textContent = 'Editar tarea';
  document.getElementById('modal-submit-btn').textContent = 'Guardar cambios';

  const mCo = document.getElementById('m-co');
  const accessibleCos = Object.entries(COMPANIES).filter(([k]) => canSee(k));
  mCo.innerHTML = accessibleCos.map(([k,co]) => `<option value="${k}">${co.name}</option>`).join('');
  mCo.value = t.company;
  updateModalClient();

  document.getElementById('m-title').value = t.title;
  document.getElementById('m-priority').value = t.priority;
  document.getElementById('m-focus').value = t.focus;
  document.getElementById('m-due').value = t.dueDate || '';
  document.getElementById('m-recurrence').value = t.recurrence || '';
  document.getElementById('m-notes').value = t.notes || '';
  document.getElementById('m-error').style.display = 'none';

  if (mCo.value === 'mnd') {
    const clientSel = document.getElementById('m-client');
    if (clientSel && t.client) clientSel.value = t.client;
  }

  const assigneeWrap = document.getElementById('m-assignee-wrap');
  if (isAdmin()) {
    const users = loadUsers();
    const sel = document.getElementById('m-assignee');
    sel.innerHTML = users.map(u =>
      `<option value="${esc(u.displayName)}" ${u.displayName === (t.assignedTo || t.createdBy) ? 'selected' : ''}>${esc(u.displayName)}</option>`
    ).join('');
    assigneeWrap.style.display = 'block';
  } else {
    assigneeWrap.style.display = 'none';
  }

  document.getElementById('modal-task').style.display = 'flex';
  setTimeout(() => document.getElementById('m-title').focus(), 60);
}

function closeTaskModal() {
  document.getElementById('modal-task').style.display = 'none';
  editingTaskId = null;
}

function updateModalClient() {
  const co = document.getElementById('m-co').value;
  const wrap = document.getElementById('m-client-wrap');
  const sel = document.getElementById('m-client');
  if (co === 'mnd') {
    wrap.style.display = 'block';
    sel.innerHTML = MND_CLIENTS.slice(1).map(c => `<option value="${c}">${c}</option>`).join('');
  } else {
    wrap.style.display = 'none';
  }
}

function submitTask() {
  const title = document.getElementById('m-title').value.trim();
  if (!title) {
    const err = document.getElementById('m-error');
    err.textContent = 'Escribe el nombre de la tarea.';
    err.style.display = 'block';
    document.getElementById('m-title').focus();
    return;
  }
  const co = document.getElementById('m-co').value;
  const client = co === 'mnd' ? document.getElementById('m-client').value : null;
  const recurrence = document.getElementById('m-recurrence').value || null;
  const dueDate = document.getElementById('m-due').value || null;
  const assignedTo = isAdmin()
    ? document.getElementById('m-assignee').value
    : currentUser.displayName;
  const notes = document.getElementById('m-notes').value.trim() || null;

  if (editingTaskId) {
    const t = tasks.find(x => x.id === editingTaskId);
    if (t) {
      t.title = title;
      t.company = co;
      t.client = client;
      t.tag = client || '';
      t.priority = document.getElementById('m-priority').value;
      t.focus = document.getElementById('m-focus').value;
      t.dueDate = dueDate;
      t.recurrence = recurrence;
      t.assignedTo = assignedTo;
      t.notes = notes;
      saveTasks(tasks);
      addActivity(currentUser.displayName, 'editó', title);
    }
  } else {
    const task = {
      id: newTaskId(),
      title,
      company: co,
      client,
      priority: document.getElementById('m-priority').value,
      focus: document.getElementById('m-focus').value,
      tag: client || '',
      done: false,
      skipped: false,
      dueDate,
      recurrence,
      lastReset: recurrence ? new Date().toISOString().slice(0, 10) : null,
      createdBy: currentUser.displayName,
      assignedTo,
      notes,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(task);
    saveTasks(tasks);
    addActivity(currentUser.displayName, 'agregó', title);
  }

  closeTaskModal();
  render();
  renderActivity();
}

/* ─── Acciones de tareas ─── */
function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  if (t.done) { t.skipped = false; t.doneAt = new Date().toISOString(); }
  else t.doneAt = null;
  saveTasks(tasks);
  addActivity(currentUser.displayName, t.done ? 'completó' : 'reabrió', t.title);
  render(); renderActivity();
}

function skipTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.skipped = true; t.done = false;
  saveTasks(tasks);
  addActivity(currentUser.displayName, 'movió a mañana', t.title);
  render(); renderActivity();
}

function restoreTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.skipped = false;
  saveTasks(tasks);
  render();
}

function deleteTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  if (!confirm(`¿Eliminar "${t.title}"?`)) return;
  tasks = tasks.filter(x => x.id !== id);
  saveTasks(tasks);
  render();
}

/* ─── Filtrado y ordenación ─── */
function visibleTasks() {
  return tasks.filter(t => {
    if (t.skipped) return false;
    if (!canSee(t.company)) return false;
    if (appState.company !== 'all' && t.company !== appState.company) return false;
    if (appState.company === 'mnd' && appState.client !== 'all' && t.client !== appState.client) return false;
    if (appState.priority !== 'all' && t.priority !== appState.priority) return false;
    if (appState.person !== 'all' && (t.assignedTo || t.createdBy) !== appState.person) return false;
    if (appState.focus === 'hoy') return t.focus === 'hoy';
    if (appState.focus === 'semana') return t.focus === 'hoy' || t.focus === 'semana';
    return true;
  }).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = a.dueDate ? new Date(a.dueDate + 'T00:00:00') : null;
    const db = b.dueDate ? new Date(b.dueDate + 'T00:00:00') : null;
    if (da && db) { if (da.getTime() !== db.getTime()) return da - db; }
    else if (da) return -1;
    else if (db) return 1;
    return PO[a.priority] - PO[b.priority];
  });
}

function skippedTasks() {
  return tasks.filter(t => t.skipped && canSee(t.company) &&
    (appState.company === 'all' || t.company === appState.company));
}

/* ─── Render ─── */
function render() {
  const vis = visibleTasks();
  const skipped = skippedTasks();

  const countFocus = f => tasks.filter(t =>
    !t.done && !t.skipped && canSee(t.company) &&
    (f === 'backlog' ? true : f === 'semana' ? (t.focus==='hoy'||t.focus==='semana') : t.focus==='hoy')
  ).length;
  ['hoy','semana','backlog'].forEach(f => {
    const n = countFocus(f);
    document.getElementById('badge-'+f).textContent = n > 0 ? n : '';
  });

  const todayAll = tasks.filter(t => t.focus==='hoy' && !t.skipped && canSee(t.company) &&
    (appState.company==='all' || t.company===appState.company));
  const done = todayAll.filter(t=>t.done).length;
  const pend = todayAll.filter(t=>!t.done).length;
  const skip = skippedTasks().length;
  document.getElementById('hs-done').textContent = done;
  document.getElementById('hs-pend').textContent = pend;
  document.getElementById('hs-skip').textContent = skip;
  const pct = (done+pend) > 0 ? Math.round(done/(done+pend)*100) : 0;
  document.getElementById('prog-fill').style.width = pct + '%';

  const list = document.getElementById('task-list');
  list.innerHTML = vis.length
    ? vis.map(taskHTML).join('')
    : `<div class="empty-state"><strong>Todo limpio ✓</strong>No hay tareas aquí. Crea una con el botón de arriba.</div>`;

  const sw = document.getElementById('skipped-wrap');
  if (skipped.length) {
    sw.style.display = 'block';
    document.getElementById('skip-cnt').textContent = `(${skipped.length})`;
    document.getElementById('skipped-list').innerHTML = skipped.map(skippedHTML).join('');
  } else {
    sw.style.display = 'none';
  }
}

function taskHTML(t) {
  const co = COMPANIES[t.company] || { color: '#888', name: t.company };
  const due = t.dueDate ? `<span class="meta-due ${dueSoonClass(t.dueDate)}">${formatDue(t.dueDate)}</span>` : '';
  const rec = t.recurrence ? `<span class="meta-recurring">↺ ${recurrenceLabel(t.recurrence)}</span>` : '';
  const assignedName = t.assignedTo || t.createdBy || '';
  const assigneeBadge = assignedName
    ? `<span class="meta-assignee">→ ${esc(assignedName)}</span>`
    : '';
  return `
  <div class="task-card ${t.done?'is-done':''}">
    <div class="p-dot p-${t.priority}"></div>
    <div class="task-chk ${t.done?'checked':''}" onclick="toggleDone('${t.id}')"></div>
    <div class="task-body">
      <div class="task-title ${t.done?'done-txt':''}">${esc(t.title)}</div>
      ${t.notes ? `<div class="task-notes">${esc(t.notes)}</div>` : ''}
      <div class="task-meta">
        <span class="meta-co" style="color:${co.color};border-color:${co.color}33">${co.name}</span>
        ${t.client ? `<span class="meta-tag">${esc(t.client)}</span>` : ''}
        ${t.tag && t.tag !== t.client ? `<span class="meta-tag">${esc(t.tag)}</span>` : ''}
        ${due}${rec}${assigneeBadge}
        <span class="meta-time">${relTime(t.createdAt)}</span>
      </div>
    </div>
    <div class="task-btns">
      ${!t.done ? `<button class="tbtn skip-btn" onclick="skipTask('${t.id}')">→ Mañana</button>` : ''}
      <button class="tbtn edit-btn" onclick="openEditTaskModal('${t.id}')">✎</button>
      <button class="tbtn del-btn" onclick="deleteTask('${t.id}')">✕</button>
    </div>
  </div>`;
}

function skippedHTML(t) {
  const co = COMPANIES[t.company] || { color: '#888', name: t.company };
  return `
  <div class="task-card is-skipped">
    <div class="task-body">
      <div class="task-title">${esc(t.title)}</div>
      <div class="task-meta">
        <span class="meta-co" style="color:${co.color}">${co.name}</span>
        ${t.client ? `<span class="meta-tag">${esc(t.client)}</span>` : ''}
        <span class="meta-user">· ${esc(t.createdBy||'')}</span>
      </div>
    </div>
    <div class="task-btns">
      <button class="tbtn restore-btn" onclick="restoreTask('${t.id}')">↩ Hoy</button>
      <button class="tbtn del-btn" onclick="deleteTask('${t.id}')">✕</button>
    </div>
  </div>`;
}

/* ─── Actividad ─── */
function renderActivity() {
  const log = loadActivity().slice(0, 8);
  const el = document.getElementById('activity-feed');
  const ICONS = { 'agregó':'＋', 'completó':'✓', 'movió a mañana':'→', 'reabrió':'↩', 'editó':'✎' };
  el.innerHTML = log.length
    ? log.map(l => `
      <div class="act-row">
        <span class="act-ico">${ICONS[l.action]||'·'}</span>
        <span><strong>${esc(l.user)}</strong> ${l.action} <em>${esc(l.task.length>45?l.task.slice(0,45)+'…':l.task)}</em></span>
        <span class="act-time">${relTime(l.time)}</span>
      </div>`).join('')
    : '<div class="act-empty">Aún no hay actividad registrada.</div>';
}

/* ─── Helpers ─── */
function relTime(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  if (m < 1440) return `hace ${Math.floor(m/60)}h`;
  return `hace ${Math.floor(m/1440)}d`;
}

function formatDue(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return `Venció hace ${Math.abs(diff)}d`;
  if (diff === 0) return 'Vence hoy';
  if (diff === 1) return 'Mañana';
  if (diff < 7) return `En ${diff} días`;
  return d.toLocaleDateString('es-CO', { day:'numeric', month:'short' });
}

function dueSoonClass(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return 'due-overdue';
  if (diff <= 1) return 'due-urgent';
  if (diff <= 3) return 'due-soon';
  return 'due-ok';
}

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function recurrenceLabel(r) {
  if (!r) return '';
  if (r === 'daily') return 'Todos los días';
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  return `Cada ${days[parseInt(r.split(':')[1])]}`;
}
