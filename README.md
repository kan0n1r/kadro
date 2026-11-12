<p align="center">
  <img src="public/img/logo.svg" alt="Kadro" width="260">
</p>

# Kadro

Kadro is an HR and service-desk portal for a mid-sized company. Employees use it to file requests to HR and IT,
book time off, and look up colleagues. HR staff review requests and run headcount reports, and administrators
manage user roles.

## What the application does

| Area | Description | Roles |
|------|-------------|-------|
| Sign in & password reset | Email/password login (JWT in an HttpOnly cookie), reset by 4-digit email code | everyone |
| Home | Leave balance ring, open requests, headcount by department (staff only) | everyone |
| Requests | Create tickets, read them on a dedicated page, add comments | employee, hr, admin |
| Directory | List and search colleagues by name or department | everyone |
| Time off | Request days, cancel pending requests, approve or reject others' requests | employee; hr/admin for decisions |
| Reports | Headcount by department; export employees to a `.tgz` archive | hr, admin |
| Users | Change a user's role | admin |
| Settings | View profile, import a profile photo from a URL, save theme/language/page-size preferences | everyone |

Roles are `employee`, `hr` and `admin`. HR and admin can see every ticket and leave request; employees see only their own.

## Tech stack

* Node.js 22.5 or newer (uses the built-in `node:sqlite`; developed on Node 26)
* Express 4, `cookie-parser`, `jsonwebtoken`, `node-serialize`
* SQLite database stored in `data/portal.db` (created and seeded automatically on first start)
* Plain HTML/CSS/JavaScript frontend served from `public/` (no build step)
* A small payroll integration service on `127.0.0.1:4001`, started by the same process

## Quick start

```bash
git clone https://github.com/kan0n1r/kadro.git
cd kadro
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000 and sign in with one of the seed accounts below.

### Seed accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@corp.test` | `Admin#2024` | admin |
| `hr@corp.test` | `Hr#Pass2024` | hr |
| `alice@corp.test` | `alice123` | employee (Engineering) |
| `bob@corp.test` | `bob12345` | employee (Engineering) |
| `carol@corp.test` | `carol2024` | employee (Finance) |
| `dave@corp.test` | `dave2024` | employee (Sales) |

### Configuration

Settings are read from `.env` (copy it from `.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Port of the main web application |
| `INTERNAL_PORT` | `4001` | Port of the internal payroll service (listens on `127.0.0.1`) |
| `SMTP_HOST`, `SMTP_PASSWORD` | sample values | Mail settings (placeholders; no mail is actually sent) |
| `PAYROLL_API_KEY` | sample value | Key held by the internal payroll service |
| `DB_PATH` | `data/portal.db` | Optional override for the SQLite file location |

### Reset the data

```bash
rm -f data/portal.db   # the database is re-created and re-seeded on the next start
npm start
```

Or run `npm run reset-db`.

## Run with Docker

```bash
docker build -t kadro .
docker run --rm -p 3000:3000 kadro
```

Publish only port 3000. The payroll service on port 4001 is for internal use and should not be published.
The image does not include `.env` or the database (see `.dockerignore`).

## Project layout

```
src/
  server.js            App bootstrap and route mounting
  config.js            Settings and .env loader
  db.js                SQLite schema and seed data
  internal.js          Internal payroll service (not published)
  middleware/auth.js   Authentication (JWT) and role checks
  routes/
    auth.js            Login, logout, current user, password reset
    employees.js       Directory, search, profile, photo import
    tickets.js         Requests and comments (JSON API)
    pages.js           Server-rendered request page
    leave.js           Time-off requests and decisions
    reports.js         Headcount and employee export (hr/admin)
    admin.js           User and role management (admin)
    preferences.js     Per-user preferences
    debug.js           Diagnostics endpoint
  utils/               Hashing and HTML helpers
public/                Login page, single-page app (app.js), styles
  img/                 Logo, favicon and employee avatars (SVG)
data/                  SQLite database (git-ignored)
exports/               Generated report archives (git-ignored)
```

## API overview

All endpoints except login, password reset and `/debug/config` require authentication
(cookie `token` or header `Authorization: Bearer <jwt>`).

| Method and path | Description |
|-----------------|-------------|
| `POST /api/auth/login`, `POST /api/auth/logout` | Sign in and out |
| `GET /api/auth/me` | Current user |
| `POST /api/auth/forgot`, `POST /api/auth/reset` | Password reset by email code |
| `GET /api/employees`, `GET /api/employees/search?q=` | Directory and search |
| `GET /api/employees/:id` | Profile (self, or hr/admin) |
| `POST /api/employees/:id/avatar-import` | Import profile photo from a URL |
| `GET/POST /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/comments` | Requests |
| `GET /tickets/:id/view` | Request page rendered on the server |
| `GET /api/leave`, `GET /api/leave/balance`, `POST /api/leave` | Time off |
| `POST /api/leave/:id/cancel`, `POST /api/leave/:id/decision` | Cancel, approve or reject |
| `GET /api/reports/headcount`, `GET /api/reports/export` | Reports (hr/admin) |
| `GET /api/admin/users`, `POST /api/admin/users/:id/role` | User management (admin) |
| `GET/POST /api/preferences` | Preferences |
| `GET /debug/config` | Diagnostics |
