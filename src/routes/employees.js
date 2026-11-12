const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, full_name, email, department, avatar_url FROM users ORDER BY full_name').all();
  res.json(rows);
});

router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const sql =
    "SELECT id, full_name, email, department FROM users WHERE full_name LIKE '%" + q +
    "%' OR department LIKE '%" + q + "%' ORDER BY full_name";
  const rows = db.prepare(sql).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id !== req.user.id && !['hr', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const row = db
    .prepare('SELECT id, full_name, email, role, department, salary, phone, leave_balance, avatar_url FROM users WHERE id = ?')
    .get(id);
  if (!row) return res.status(404).json({ error: 'Employee not found' });
  res.json(row);
});

router.post('/:id/avatar-import', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { url } = req.body || {};
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'A valid http(s) URL is required' });
    }
    const upstream = await fetch(url);
    const buf = Buffer.from(await upstream.arrayBuffer());
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(url, id);
    res.json({
      status: upstream.status,
      contentType: upstream.headers.get('content-type'),
      size: buf.length,
      preview: buf.toString('utf8', 0, 500),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
