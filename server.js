const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = process.env.DATA_FILE || '/data/gruntt.json';
const PORT = process.env.PORT || 3000;
const VALID_KEYS = new Set(['users', 'tasks', 'activity']);

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return {}; }
}

function writeStore(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8');
}

app.get('/api/sync', (req, res) => {
  res.json(readStore());
});

app.post('/api/sync/:key', (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.has(key)) return res.status(400).json({ error: 'invalid key' });
  const store = readStore();
  store[key] = req.body;
  writeStore(store);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Gruntt server :${PORT}`));
