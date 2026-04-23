/* ═══════════════════════════════════════════
   ADMIN.JS — Gestión de usuarios
   ═══════════════════════════════════════════ */

function goAdmin() {
  if (!isAdmin()) return;
  showScreen('admin');
  renderAdminUserList();
}

function goApp() {
  showScreen('app');
  render();
}

function renderAdminUserList() {
  const users = loadUsers();
  const el = document.getElementById('admin-user-list');
  el.innerHTML = users.map(u => `
    <div class="user-row" onclick="editUser('${u.id}')">
      <div class="user-row-left">
        <div class="user-avatar" style="background:${u.role==='admin'?'#FF4D00':'#333'}">${u.displayName.charAt(0).toUpperCase()}</div>
        <div>
          <div class="user-name">${esc(u.displayName)}</div>
          <div class="user-meta">@${esc(u.username)} · ${u.role === 'admin' ? 'Admin' : 'Usuario'}</div>
        </div>
      </div>
      <div class="user-co-dots">
        ${['gruntt','mnd','won'].map(c =>
          `<span class="co-mini-dot" style="background:${u.companies.includes(c)?COMPANIES[c].color:'#333'}" title="${COMPANIES[c].name}"></span>`
        ).join('')}
      </div>
    </div>
  `).join('');
}

function openNewUser() {
  renderUserEditor(null);
}

function editUser(id) {
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  renderUserEditor(user);
}

function renderUserEditor(user) {
  const isNew = !user;
  const el = document.getElementById('admin-editor');
  el.innerHTML = `
    <div class="editor-card">
      <h3 class="editor-title">${isNew ? 'Nuevo usuario' : 'Editar usuario'}</h3>

      <div class="field">
        <label>Nombre para mostrar</label>
        <input type="text" id="ed-display" value="${esc(user?.displayName||'')}" placeholder="Ej: Laura Gruntt"/>
      </div>
      <div class="field">
        <label>Nombre de usuario (para login)</label>
        <input type="text" id="ed-username" value="${esc(user?.username||'')}" placeholder="ej: laura" ${!isNew && user.role==='admin'?'disabled':''}/>
      </div>
      <div class="field">
        <label>${isNew ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
        <input type="password" id="ed-pass" placeholder="••••••••"/>
      </div>
      <div class="field">
        <label>Rol</label>
        <select id="ed-role" ${user?.role==='admin'?'disabled':''}>
          <option value="user" ${user?.role!=='admin'?'selected':''}>Usuario</option>
          <option value="admin" ${user?.role==='admin'?'selected':''}>Admin (acceso total)</option>
        </select>
      </div>
      <div class="field">
        <label>Acceso a empresas</label>
        <div class="co-checkboxes">
          ${Object.entries(COMPANIES).map(([key,co]) => `
            <label class="co-check-label">
              <input type="checkbox" id="ed-co-${key}" value="${key}"
                ${user?.companies?.includes(key)||user?.role==='admin'?'checked':''}
                ${user?.role==='admin'?'disabled':''}/>
              <span class="co-check-pill" style="--c:${co.color}">${co.name}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div id="ed-error" class="form-error" style="display:none"></div>

      <div class="editor-actions">
        ${!isNew && user.role !== 'admin' ? `<button class="btn-danger" onclick="deleteUser('${user.id}')">Eliminar usuario</button>` : ''}
        <button class="btn-ghost" onclick="resetEditor()">Cancelar</button>
        <button class="btn-primary" onclick="saveUser('${isNew?'new':user.id}')">
          ${isNew ? 'Crear usuario' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  `;
}

function saveUser(idOrNew) {
  const displayName = document.getElementById('ed-display').value.trim();
  const username = document.getElementById('ed-username').value.trim().toLowerCase();
  const pass = document.getElementById('ed-pass').value;
  const role = document.getElementById('ed-role').value;
  const errEl = document.getElementById('ed-error');

  if (!displayName || !username) { showEdErr('Nombre y usuario son obligatorios.'); return; }

  const companies = ['gruntt','mnd','won'].filter(c => {
    const el = document.getElementById('ed-co-'+c);
    return el && el.checked;
  });

  if (role !== 'admin' && companies.length === 0) { showEdErr('Asigna al menos una empresa.'); return; }

  const users = loadUsers();

  if (idOrNew === 'new') {
    if (!pass) { showEdErr('La contraseña es obligatoria para nuevos usuarios.'); return; }
    const existing = users.find(u => u.username === username);
    if (existing) { showEdErr('Ese nombre de usuario ya existe.'); return; }
    const newUser = {
      id: 'u' + Date.now(),
      username,
      passwordHash: hashPass(pass),
      role,
      companies: role === 'admin' ? ['gruntt','mnd','won'] : companies,
      displayName,
    };
    users.push(newUser);
  } else {
    const idx = users.findIndex(u => u.id === idOrNew);
    if (idx === -1) return;
    users[idx].displayName = displayName;
    if (users[idx].role !== 'admin') users[idx].username = username;
    if (pass) users[idx].passwordHash = hashPass(pass);
    users[idx].role = role;
    users[idx].companies = role === 'admin' ? ['gruntt','mnd','won'] : companies;
  }

  saveUsers(users);
  renderAdminUserList();
  resetEditor();
}

function deleteUser(id) {
  if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
  const users = loadUsers().filter(u => u.id !== id);
  saveUsers(users);
  renderAdminUserList();
  resetEditor();
}

function resetEditor() {
  document.getElementById('admin-editor').innerHTML = `
    <div class="admin-placeholder"><p>Selecciona un usuario para editarlo<br>o crea uno nuevo</p></div>`;
}

function showEdErr(msg) {
  const el = document.getElementById('ed-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
