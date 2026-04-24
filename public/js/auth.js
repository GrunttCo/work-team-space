/* ═══════════════════════════════════════════
   AUTH.JS — Sesión y permisos
   ═══════════════════════════════════════════ */

let currentUser = null; // objeto usuario activo

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    const users = loadUsers();
    return users.find(u => u.id === userId) || null;
  } catch(e) { return null; }
}

function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  currentUser = user;
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  currentUser = null;
}

function doLogin() {
  const uname = document.getElementById('li-user').value.trim().toLowerCase();
  const pass = document.getElementById('li-pass').value;
  const errEl = document.getElementById('li-error');

  if (!uname || !pass) { showErr('Completa usuario y contraseña.'); return; }

  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === uname);

  if (!user || user.passwordHash !== hashPass(pass)) {
    showErr('Usuario o contraseña incorrectos.');
    document.getElementById('li-pass').value = '';
    return;
  }

  setSession(user);
  errEl.style.display = 'none';
  bootApp();
}

function doLogout() {
  clearSession();
  showScreen('login');
  document.getElementById('li-user').value = '';
  document.getElementById('li-pass').value = '';
}

function showErr(msg) {
  const el = document.getElementById('li-error');
  el.textContent = msg;
  el.style.display = 'block';
}

/* ─── Tecla Enter en login ─── */
document.addEventListener('DOMContentLoaded', async () => {
  ['li-user','li-pass'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // Sync antes de mostrar login para que las credenciales del servidor estén disponibles
  await syncFromServer();

  const saved = getSession();
  if (saved) {
    currentUser = saved;
    bootApp();
  } else {
    showScreen('login');
  }
});

/* ─── Permiso: ¿puede ver esta empresa? ─── */
function canSee(company) {
  if (!currentUser) return false;
  return currentUser.companies.includes(company);
}

function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}
