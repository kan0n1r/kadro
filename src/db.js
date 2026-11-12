const { DatabaseSync } = require('node:sqlite');
const config = require('./config');
const { hashPassword } = require('./utils/crypto');

const db = new DatabaseSync(config.dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  salary INTEGER NOT NULL DEFAULT 0,
  phone TEXT,
  leave_balance INTEGER NOT NULL DEFAULT 20,
  avatar_url TEXT,
  reset_code TEXT
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function seed() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return;

  const addUser = db.prepare(
    'INSERT INTO users (email, password, role, full_name, department, salary, phone) VALUES (?,?,?,?,?,?,?)'
  );
  const users = [
    ['admin@corp.test', 'Admin#2024', 'admin', 'System Administrator', 'IT', 9000, '+380501110001'],
    ['hr@corp.test', 'Hr#Pass2024', 'hr', 'Helen Ross', 'HR', 6500, '+380501110002'],
    ['alice@corp.test', 'alice123', 'employee', 'Alice Johnson', 'Engineering', 5200, '+380501110003'],
    ['bob@corp.test', 'bob12345', 'employee', 'Bob Miller', 'Engineering', 4800, '+380501110004'],
    ['carol@corp.test', 'carol2024', 'employee', 'Carol White', 'Finance', 6100, '+380501110005'],
    ['dave@corp.test', 'dave2024', 'employee', 'Dave Brown', 'Sales', 4300, '+380501110006'],
  ];
  for (const u of users) addUser.run(u[0], hashPassword(u[1]), u[2], u[3], u[4], u[5], u[6]);

  const addTicket = db.prepare('INSERT INTO tickets (author_id, subject, body, status) VALUES (?,?,?,?)');
  addTicket.run(3, 'Laptop replacement request', 'My laptop battery lasts less than an hour. Please arrange a replacement.', 'open');
  addTicket.run(4, 'VPN access', 'I need VPN access for the new Berlin project.', 'in_progress');
  addTicket.run(5, 'Salary review - confidential', 'I would like to discuss my salary adjustment. My current compensation does not reflect the Q3 scope increase. IBAN for bonus payout: UA21 3223 1300 0002 6007 2335 6600 1.', 'open');
  addTicket.run(6, 'Parking permit', 'Requesting a parking permit for the main office.', 'closed');

  db.prepare('INSERT INTO comments (ticket_id, author_id, body) VALUES (?,?,?)')
    .run(1, 2, 'Approved, IT will contact you this week.');
}
seed();

module.exports = db;
