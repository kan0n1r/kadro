const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    node: process.version,
    platform: process.platform,
    uptimeSeconds: Math.round(process.uptime()),
    cwd: process.cwd(),
    port: config.port,
    dbPath: config.dbPath,
    env: process.env,
  });
});

module.exports = router;
