const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('../db');
const config = require('../config');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('hr', 'admin'));

router.get('/headcount', (req, res) => {
  const rows = db.prepare('SELECT department, COUNT(*) AS headcount FROM users GROUP BY department').all();
  res.json(rows);
});

router.get('/export', (req, res, next) => {
  const dept = req.query.department;
  const name = req.query.name || 'employees-report';

  const rows = dept
    ? db.prepare('SELECT id, full_name, email, department, phone FROM users WHERE department = ?').all(dept)
    : db.prepare('SELECT id, full_name, email, department, phone FROM users').all();

  const csvFile = `${name}.csv`;
  const csv = ['id,full_name,email,department,phone', ...rows.map((r) => Object.values(r).join(','))].join('\n');
  fs.writeFileSync(path.join(config.exportDir, 'latest.csv'), csv);

  const cmd = `tar -czf exports/${name}.tgz -C exports latest.csv && ls -l exports/${name}.tgz`;
  exec(cmd, { cwd: path.join(__dirname, '..', '..') }, (err, stdout) => {
    if (err) return next(err);
    res.json({ archive: `${name}.tgz`, rows: rows.length, details: stdout.trim() });
  });
});

module.exports = router;
