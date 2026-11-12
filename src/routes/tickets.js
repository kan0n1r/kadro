const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const isStaff = (user) => ['hr', 'admin'].includes(user.role);

router.get('/', (req, res) => {
  const rows = isStaff(req.user)
    ? db.prepare('SELECT id, author_id, subject, status, created_at FROM tickets ORDER BY id DESC').all()
    : db.prepare('SELECT id, author_id, subject, status, created_at FROM tickets WHERE author_id = ? ORDER BY id DESC').all(req.user.id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { subject, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });
  const r = db.prepare('INSERT INTO tickets (author_id, subject, body) VALUES (?,?,?)').run(req.user.id, subject, body);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.get('/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const comments = db.prepare('SELECT id, author_id, body, created_at FROM comments WHERE ticket_id = ? ORDER BY id').all(ticket.id);
  res.json({ ...ticket, comments });
});

router.post('/:id/comments', (req, res) => {
  const ticket = db.prepare('SELECT id, author_id FROM tickets WHERE id = ?').get(Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.author_id !== req.user.id && !isStaff(req.user)) return res.status(403).json({ error: 'Forbidden' });

  const { body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'body is required' });
  const r = db.prepare('INSERT INTO comments (ticket_id, author_id, body) VALUES (?,?,?)').run(ticket.id, req.user.id, body);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

module.exports = router;
