const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
require('./db');
const internal = require('./internal');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/preferences', require('./routes/preferences'));
app.use('/debug', require('./routes/debug'));
app.use('/', require('./routes/pages'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

internal.start();
app.listen(config.port, () => console.log(`HR portal listening on http://localhost:${config.port}`));
