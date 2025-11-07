// api/server.js
const path = require('path');
const express = require('express');
const app = express();
const os = require('os');
const { books } = require('./data.cjs');
const { newId, validateBookPayload } = require('./util.cjs');

// parse JSON bodies
app.use(express.json());

// fast, dependency-free health for probes
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', host: os.hostname() });
});

// read-only list for Lab 5 validation
app.get('/api/books', (_req, res) => {
  res.status(200).json({ items: books, count: books.length });
});

// create
app.post('/api/books', (req, res) => {
  const v = validateBookPayload(req.body);
  if (!v.ok) return res.status(400).json({ error: v.msg });
  const b = { id: newId(), title: req.body.title.trim(), author: req.body.author.trim(), year: req.body.year };
  books.push(b);
  return res.status(201).json(b);
});

// read one
app.get('/api/books/:id', (req, res) => {
  const b = books.find(x => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'not found' });
  return res.status(200).json(b);
});

// update (partial)
app.patch('/api/books/:id', (req, res) => {
  const idx = books.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const body = req.body || {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) return res.status(400).json({ error: 'invalid title' });
    books[idx].title = body.title.trim();
  }
  if (body.author !== undefined) {
    if (typeof body.author !== 'string' || !body.author.trim()) return res.status(400).json({ error: 'invalid author' });
    books[idx].author = body.author.trim();
  }
  if (body.year !== undefined) {
    if (!Number.isInteger(body.year)) return res.status(400).json({ error: 'year must be integer' });
    books[idx].year = body.year;
  }
  return res.status(200).json(books[idx]);
});

// delete
app.delete('/api/books/:id', (req, res) => {
  const idx = books.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const [removed] = books.splice(idx, 1);
  return res.status(200).json(removed);
});
// --- Serve Vite build output in production ---
const distDir = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(distDir));
// SPA fallback: send index.html for non-API routes
app.get(/^\/(?!api).*/, (req, res) => {
 res.sendFile(path.join(distDir, 'index.html'));
});

// start server (default 3000 locally; Lab 5 will use :80 via systemd)
const server = app.listen(process.env.PORT || 3000, () =>
  console.log(`api up on :${server.address().port}`)
);

// graceful shutdown (SIGTERM)
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});


// allow tests to import and close the server
module.exports = { app, server };
