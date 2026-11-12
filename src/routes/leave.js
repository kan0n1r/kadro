const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/balance', (req, res) => {
  const { leave_balance } = db.prepare('SELECT leave_balance FROM users WHERE id = ?').get(req.user.id);
  res.json({ balance: leave_balance });
});

router.get('/', (req, res) => {
  const rows = ['hr', 'admin'].includes(req.user.role)
    ? db.prepare('SELECT * FROM leave_requests ORDER BY id DESC').all()
    : db.prepare('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const days = Number(req.body && req.body.days);
  const reason = (req.body && req.body.reason) || '';
  if (!Number.isInteger(days) || days === 0) return res.status(400).json({ error: 'days must be a non-zero integer' });

  const { leave_balance } = db.prepare('SELECT leave_balance FROM users WHERE id = ?').get(req.user.id);
  if (days > leave_balance) return res.status(400).json({ error: 'Insufficient leave balance' });

  db.prepare('UPDATE users SET leave_balance = leave_balance - ? WHERE id = ?').run(days, req.user.id);
  const r = db.prepare('INSERT INTO leave_requests (user_id, days, reason) VALUES (?,?,?)').run(req.user.id, days, reason);
  res.status(201).json({ id: Number(r.lastInsertRowid), balance: leave_balance - days });
});

router.post('/:id/cancel', (req, res) => {
  const lr = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(Number(req.params.id));
  if (!lr || lr.user_id !== req.user.id) return res.status(404).json({ error: 'Request not found' });
  if (lr.status !== 'pending') return res.status(409).json({ error: 'Only pending requests can be cancelled' });
  db.prepare("UPDATE leave_requests SET status = 'cancelled' WHERE id = ?").run(lr.id);
  db.prepare('UPDATE users SET leave_balance = leave_balance + ? WHERE id = ?').run(lr.days, lr.user_id);
  res.json({ ok: true });
});

router.post('/:id/decision', requireRole('hr', 'admin'), (req, res) => {
  const { approve } = req.body || {};
  const lr = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(Number(req.params.id));
  if (!lr) return res.status(404).json({ error: 'Request not found' });
  if (lr.status !== 'pending') return res.status(409).json({ error: 'Already processed' });
  if (lr.user_id === req.user.id) return res.status(403).json({ error: 'You cannot decide your own request' });
  if (approve) {
    db.prepare("UPDATE leave_requests SET status = 'approved' WHERE id = ?").run(lr.id);
  } else {
    db.prepare("UPDATE leave_requests SET status = 'rejected' WHERE id = ?").run(lr.id);
    db.prepare('UPDATE users SET leave_balance = leave_balance + ? WHERE id = ?').run(lr.days, lr.user_id);
  }
  res.json({ ok: true });
});

module.exports = router;
