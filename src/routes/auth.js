const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { hashPassword } = require('../utils/crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.password !== hashPassword(password)) return res.status(401).json({ error: 'Incorrect password' });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: config.tokenTtl,
  });
  res.cookie('token', token, { httpOnly: true });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name } });
});

router.get('/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id, email, role, full_name, department FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ id: u.id, email: u.email, role: u.role, fullName: u.full_name, department: u.department });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.post('/forgot', (req, res) => {
  const { email } = req.body || {};
  const user = email && db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (user) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    db.prepare('UPDATE users SET reset_code = ? WHERE id = ?').run(code, user.id);
    // delivered to the user's mailbox by the mail worker
  }
  res.json({ message: 'If the account exists, a 4-digit reset code has been sent by email.' });
});

router.post('/reset', (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'email, code and newPassword are required' });

  const user = db.prepare('SELECT id, reset_code FROM users WHERE email = ?').get(email);
  if (!user || !user.reset_code || user.reset_code !== String(code)) {
    return res.status(400).json({ error: 'Invalid reset code' });
  }
  db.prepare('UPDATE users SET password = ?, reset_code = NULL WHERE id = ?').run(hashPassword(newPassword), user.id);
  res.json({ message: 'Password updated' });
});

module.exports = router;
