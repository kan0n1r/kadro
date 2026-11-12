const express = require('express');
const config = require('./config');

// Payroll integration service.
const app = express();

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/internal/payroll-config', (req, res) => {
  res.json({
    service: 'payroll-gateway',
    apiKey: process.env.PAYROLL_API_KEY,
    bankExportEndpoint: 'sftp://bank.corp.test/payroll/outbound',
  });
});

function start() {
  return app.listen(config.internalPort, '127.0.0.1');
}

module.exports = { start };
