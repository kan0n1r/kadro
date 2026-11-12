const fs = require('fs');
const path = require('path');

// minimal .env loader
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  internalPort: Number(process.env.INTERNAL_PORT || 4001),
  jwtSecret: 'hr-portal-secret',
  tokenTtl: '8h',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'portal.db'),
  exportDir: path.join(__dirname, '..', 'exports'),
};
