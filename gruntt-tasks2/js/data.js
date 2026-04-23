/* ═══════════════════════════════════════════
   DATA.JS — Configuración central de Gruntt
   ═══════════════════════════════════════════ */

/* ─── COMPANIES ─── */
const COMPANIES = {
  gruntt: { name: 'Gruntt',      color: '#FF4D00' },
  mnd:    { name: 'MND Agency',  color: '#185FA5' },
  won:    { name: 'WON Sports',  color: '#3B6D11' },
};

/* ─── MND CLIENTS ─── */
const MND_CLIENTS = [
  'Todos los clientes',
  'Hospitecnica',
  'Divinoplay',
  'Civil United',
  'Grupo K',
  'Biosignos',
  'MND Agency (Interno)',
  'WON Sports',
  'Mendideportivo',
];

/* ─── USERS (admin los gestiona, se guardan en localStorage) ─── */
// Estructura de usuario:
// { id, username, passwordHash, role: 'admin'|'user', companies: ['gruntt','mnd','won'], displayName }

const USERS_STORE = 'gruntt_users_v3';
const SESSION_KEY = 'gruntt_session_v3';
const TASKS_STORE = 'gruntt_tasks_v3';
const ACTIVITY_STORE = 'gruntt_activity_v3';

/* Hash simple (no criptográfico, suficiente para uso interno sin backend) */
function hashPass(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

/* ─── SEED USERS (primera vez) ─── */
const SEED_USERS = [
  {
    id: 'u1',
    username: 'admin',
    passwordHash: hashPass('gruntt2025'),
    role: 'admin',
    companies: ['gruntt', 'mnd', 'won'],
    displayName: 'Admin (tú)',
  },
];

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORE);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  saveUsers(SEED_USERS);
  return SEED_USERS;
}

function saveUsers(users) {
  localStorage.setItem(USERS_STORE, JSON.stringify(users));
}

/* ─── TASKS ─── */
const SEED_TASKS = [
  { id: 't1', title: 'Mapear contactos fríos de marcas', company: 'gruntt', client: null, priority: 'alta', focus: 'hoy', tag: 'Marcas & patrocinios', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
  { id: 't2', title: 'Enviar 5 WhatsApp de reactivación (caso Geiny/Karoll)', company: 'gruntt', client: null, priority: 'alta', focus: 'hoy', tag: 'Marcas & patrocinios', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
  { id: 't3', title: 'Confirmar participación Geiny y Karoll — evento 30 ago', company: 'gruntt', client: null, priority: 'alta', focus: 'hoy', tag: 'Evento patinaje', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
  { id: 't4', title: 'Definir formato mínimo del evento — recorrido y permisos', company: 'gruntt', client: null, priority: 'alta', focus: 'hoy', tag: 'Evento patinaje', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
  { id: 't5', title: 'Pedir 2 referidos de deportistas nuevos a atletas actuales', company: 'gruntt', client: null, priority: 'media', focus: 'hoy', tag: 'Nuevos deportistas', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
  { id: 't6', title: 'Armar paquetes de patrocinio evento: naming, activación, digital', company: 'gruntt', client: null, priority: 'media', focus: 'semana', tag: 'Evento patinaje', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
  { id: 't7', title: 'Revisar propuestas activas y seguimiento a clientes', company: 'mnd', client: 'MND Agency (Interno)', priority: 'alta', focus: 'hoy', tag: 'Operación', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
  { id: 't8', title: 'Revisar inventario y pedidos pendientes', company: 'won', client: null, priority: 'media', focus: 'hoy', tag: 'Operación', done: false, skipped: false, createdBy: 'admin', createdAt: new Date().toISOString() },
];

let _taskIdCounter = 200;

function loadTasks() {
  try {
    const raw = localStorage.getItem(TASKS_STORE);
    if (raw) {
      const d = JSON.parse(raw);
      _taskIdCounter = d.counter || 200;
      return d.tasks || [];
    }
  } catch(e) {}
  saveTasks(SEED_TASKS, 200);
  return SEED_TASKS;
}

function saveTasks(tasks, counter) {
  localStorage.setItem(TASKS_STORE, JSON.stringify({ tasks, counter: counter || _taskIdCounter }));
  try { bc.postMessage({ type: 'sync' }); } catch(e) {}
}

function newTaskId() {
  return 't' + (++_taskIdCounter);
}

/* ─── ACTIVITY ─── */
function loadActivity() {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_STORE) || '[]'); } catch(e) { return []; }
}

function addActivity(user, action, taskTitle) {
  const log = loadActivity();
  log.unshift({ user, action, task: taskTitle, time: new Date().toISOString() });
  if (log.length > 30) log.pop();
  localStorage.setItem(ACTIVITY_STORE, JSON.stringify(log));
  try { bc.postMessage({ type: 'activity' }); } catch(e) {}
}

/* ─── BROADCAST (entre pestañas) ─── */
const bc = new BroadcastChannel('gruntt_cc');
