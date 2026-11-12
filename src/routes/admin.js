const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/users', (req, res) => {
  res.json(db.prepare('SELECT id, email, role, full_name, department, salary FROM users').all());
});

router.post('/users/:id/role', (req, res) => {
  const { role } = req.body || {};
  if (!['employee', 'hr', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
