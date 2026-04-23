const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = process.env.DATA_FILE || '/data/gruntt.json';
const PORT = process.env.PORT || 3000;
const VALID_KEYS = new Set(['users', 'tasks', 'activity']);
const API_SECRET = process.env.API_SECRET || 'dev-local-insecure';

app.use(express.json({ limit: '2mb' }));

function requireToken(req, res, next) {
  if (req.headers['x-gruntt-token'] !== API_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return {}; }
}

function writeStore(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8');
}

/* Sirve index.html con el token inyectado para que el cliente pueda usarlo */
app.get('/', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const injected = html.replace('</head>', `<script>window._grt='${API_SECRET}';</script></head>`);
  res.send(injected);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/sync', requireToken, (req, res) => {
  res.json(readStore());
});

app.post('/api/sync/:key', requireToken, (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.has(key)) return res.status(400).json({ error: 'invalid key' });
  const store = readStore();
  store[key] = req.body;
  writeStore(store);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Gruntt server :${PORT}`));
