const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { escapeHtml } = require('../utils/html');

const router = express.Router();

router.get('/tickets/:id/view', requireAuth, (req, res) => {
  const ticket = db
    .prepare('SELECT t.*, u.full_name AS author FROM tickets t JOIN users u ON u.id = t.author_id WHERE t.id = ?')
    .get(Number(req.params.id));
  if (!ticket) return res.status(404).send('Ticket not found');
  if (ticket.author_id !== req.user.id && !['hr', 'admin'].includes(req.user.role)) {
    return res.status(403).send('Forbidden');
  }
  const comments = db
    .prepare('SELECT c.body, c.created_at, u.full_name FROM comments c JOIN users u ON u.id = c.author_id WHERE c.ticket_id = ? ORDER BY c.id')
    .all(ticket.id);

  const items = comments
    .map((c) => `<li><strong>${escapeHtml(c.full_name)}</strong> <small>${escapeHtml(c.created_at)}</small><p>${c.body}</p></li>`)
    .join('');

  res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kadro - Request #${ticket.id}</title><link rel="stylesheet" href="/style.css"></head>
<body><div class="doc">
<div class="topline"><a href="/app.html#/tickets">&larr; All requests</a><strong>Kadro</strong></div>
<h1>#${ticket.id} ${escapeHtml(ticket.subject)}</h1>
<div class="meta"><span>${escapeHtml(ticket.author)}</span><span class="chip ${escapeHtml(ticket.status)}">${escapeHtml(ticket.status.replace('_', ' '))}</span></div>
<div class="body">${escapeHtml(ticket.body)}</div>
<h2 style="margin-top:28px">Comments</h2>
<ul class="comments">${items || '<li class="muted">No comments yet.</li>'}</ul>
<form class="add-comment" id="cf"><label for="cb">Add a comment</label><textarea id="cb" required></textarea><button class="btn">Post comment</button></form>
</div>
<script>
document.getElementById('cf').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await fetch('/api/tickets/${ticket.id}/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: document.getElementById('cb').value }) });
  if (r.ok) location.reload();
});
</script>
</body></html>`);
});

module.exports = router;
