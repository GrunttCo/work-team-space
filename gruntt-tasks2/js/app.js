/* ═══════════════════════════════════════════
   APP.JS — Lógica principal de tareas
   ═══════════════════════════════════════════ */

let tasks = [];
let appState = { focus: 'hoy', company: 'all', client: 'all' };
const PO = { alta: 0, media: 1, baja: 2 };

/* ─── Screens ─── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

/* ─── Boot ─── */
function bootApp() {
  tasks = loadTasks();
  showScreen('app');
  setupSidebar();
  setupAddBox();
  setupDate();
  setupOnline();
  render();
  renderActivity();

  bc.onmessage = (e) => {
    if (e.data.type === 'sync') { tasks = loadTasks(); render(); }
    if (e.data.type === 'activity') renderActivity();
  };

  document.getElementById('task-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
}

/* ─── Sidebar build ─── */
function setupSidebar() {
  // Current user badge
  document.getElementById('current-user-badge').innerHTML =
    `<span class="cu-name">${esc(currentUser.displayName)}</span>`;

  // Admin button
  if (isAdmin()) document.getElementById('admin-btn').style.display = 'flex';

  // Company nav — solo empresas a las que tiene acceso
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

  // Si solo tiene acceso a una empresa, seleccionarla
  if (accessibleCos.length === 1) {
    appState.company = accessibleCos[0][0];
    coNav.querySelector('.snav').classList.add('active-co');
  }

  // Populate add-box company select
  const optCo = document.getElementById('opt-co');
  optCo.innerHTML = accessibleCos.map(([k,co]) =>
    `<option value="${k}">${co.name}</option>`
  ).join('');
  updateClientOpt();
}

function setupAddBox() {
  updateClientOpt();
}

function updateClientOpt() {
  const co = document.getElementById('opt-co').value;
  const clientSel = document.getElementById('opt-client');
  if (co === 'mnd') {
    clientSel.style.display = 'block';
    clientSel.innerHTML = MND_CLIENTS.slice(1).map(c =>
      `<option value="${c}">${c}</option>`
    ).join('');
  } else {
    clientSel.style.display = 'none';
  }
}

/* ─── Date & greetings ─── */
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

/* ─── Filters ─── */
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

  // Show/hide MND client nav
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

/* ─── Add task ─── */
function addTask() {
  const inp = document.getElementById('task-input');
  const title = inp.value.trim();
  if (!title) return;
  const co = document.getElementById('opt-co').value;
  const clientEl = document.getElementById('opt-client');
  const client = co === 'mnd' && clientEl.style.display !== 'none' ? clientEl.value : null;
  const task = {
    id: newTaskId(),
    title,
    company: co,
    client,
    priority: document.getElementById('opt-priority').value,
    focus: document.getElementById('opt-focus').value,
    tag: client || '',
    done: false,
    skipped: false,
    createdBy: currentUser.displayName,
    createdAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  saveTasks(tasks);
  addActivity(currentUser.displayName, 'agregó', title);
  inp.value = '';
  render();
  renderActivity();
}

/* ─── Task actions ─── */
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

/* ─── Filter helpers ─── */
function visibleTasks() {
  return tasks.filter(t => {
    if (t.skipped) return false;
    if (!canSee(t.company)) return false;
    if (appState.company !== 'all' && t.company !== appState.company) return false;
    if (appState.company === 'mnd' && appState.client !== 'all' && t.client !== appState.client) return false;
    if (appState.focus === 'hoy') return t.focus === 'hoy';
    if (appState.focus === 'semana') return t.focus === 'hoy' || t.focus === 'semana';
    return true;
  }).sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
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

  // Badges
  const countFocus = f => tasks.filter(t =>
    !t.done && !t.skipped && canSee(t.company) &&
    (f === 'backlog' ? true : f === 'semana' ? (t.focus==='hoy'||t.focus==='semana') : t.focus==='hoy')
  ).length;
  ['hoy','semana','backlog'].forEach(f => {
    const n = countFocus(f);
    document.getElementById('badge-'+f).textContent = n > 0 ? n : '';
  });

  // Stats
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

  // Task list
  const list = document.getElementById('task-list');
  list.innerHTML = vis.length
    ? vis.map(taskHTML).join('')
    : `<div class="empty-state"><strong>Todo limpio ✓</strong>No hay tareas aquí. Agrega una arriba.</div>`;

  // Skipped
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
  return `
  <div class="task-card ${t.done?'is-done':''}">
    <div class="p-dot p-${t.priority}"></div>
    <div class="task-chk ${t.done?'checked':''}" onclick="toggleDone('${t.id}')"></div>
    <div class="task-body">
      <div class="task-title ${t.done?'done-txt':''}">${esc(t.title)}</div>
      <div class="task-meta">
        <span class="meta-co" style="color:${co.color};border-color:${co.color}33">${co.name}</span>
        ${t.client ? `<span class="meta-tag">${esc(t.client)}</span>` : ''}
        ${t.tag && t.tag !== t.client ? `<span class="meta-tag">${esc(t.tag)}</span>` : ''}
        <span class="meta-user">· ${esc(t.createdBy||'')}</span>
        <span class="meta-time">${relTime(t.createdAt)}</span>
      </div>
    </div>
    <div class="task-btns">
      ${!t.done ? `<button class="tbtn skip-btn" onclick="skipTask('${t.id}')">→ Mañana</button>` : ''}
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

/* ─── Activity ─── */
function renderActivity() {
  const log = loadActivity().slice(0, 8);
  const el = document.getElementById('activity-feed');
  const ICONS = { 'agregó':'＋', 'completó':'✓', 'movió a mañana':'→', 'reabrió':'↩' };
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

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
