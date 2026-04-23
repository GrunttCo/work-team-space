# Gruntt Command Center v2

App interna de gestión de tareas para Gruntt / MND Agency / WON Sports.

## Acceso inicial (admin)

| Usuario | Contraseña    |
|---------|---------------|
| admin   | gruntt2025    |

**Cambia esta contraseña inmediatamente** desde el panel Admin → editar usuario admin.

## Cómo crear nuevos usuarios (tú como admin)

1. Inicia sesión como `admin`
2. Sidebar → botón **⚙ Admin**
3. Click en **+ Nuevo usuario**
4. Define: nombre, usuario, contraseña, rol, y qué empresas puede ver
5. Guardar → el usuario ya puede entrar

## Acceso por empresa

- **Admin**: ve Gruntt + MND Agency + WON Sports
- **Usuario Gruntt**: solo ve Gruntt
- **Usuario MND**: solo ve MND Agency (+ filtro por cliente)
- **Usuario WON**: solo ve WON Sports

## Clientes MND configurados

- Hospitecnica
- Divinoplay
- Civil United
- Grupo K
- Biosignos
- MND Agency (Interno)
- WON Sports
- Mendideportivo

Para agregar clientes, edita `js/data.js` → array `MND_CLIENTS`.

## Deploy en Dokploy

1. Sube esta carpeta a un repo GitHub (org: GrunttCo), branch: `main`
2. Dokploy → New Application → Docker
3. Apunta al repo, puerto: `80`
4. Deploy ✓

## Stack
HTML + CSS + JS puro · Nginx Alpine · Docker
Persistencia: localStorage + BroadcastChannel (entre pestañas)
Sesión: sessionStorage (se cierra al cerrar el navegador)

## Siguiente paso (cuando quieras)
Conectar Supabase para sincronización real entre dispositivos distintos.
