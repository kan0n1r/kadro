const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
const view = $('#view');
let me = null;

const ICONS = {
  dashboard: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  tickets: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z"/>',
  directory: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.500 2.400 6.500 6"/><circle cx="17.500" cy="9" r="2.500"/><path d="M17 14c2.700 0 4.500 1.800 4.500 4.500"/>',
  leave: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  admin: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  out: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

async function api(url, opts) {
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/'; throw new Error('Not signed in'); }
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}
const send = (url, body, method = 'POST') => api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

let toastTimer;
function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = ''), 3200);
}

const initials = (n) => String(n).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const hue = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const slug = (email) => String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
const avatar = (name, cls = '', src = '') =>
  `<span class="avatar ${cls}" style="background:hsl(${hue(name)} 42% 38%)" aria-hidden="true">${esc(initials(name))}${src ? `<img src="${esc(src)}" alt="">` : ''}</span>`;
const person = (name, email, cls = '', src = '') => avatar(name, cls, src || (slug(email) ? `/img/avatars/${slug(email)}.svg` : ''));
document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG' && e.target.parentElement.classList.contains('avatar')) e.target.remove(); }, true);
const chip = (s) => `<span class="chip ${esc(s)}">${esc(String(s).replace('_', ' '))}</span>`;
const isStaff = () => ['hr', 'admin'].includes(me.role);
const date = (s) => esc(String(s).slice(0, 10));

/* ---------- pages ---------- */
const pages = {
  async dashboard() {
    const [bal, tickets, leaves] = await Promise.all([api('/api/leave/balance'), api('/api/tickets'), api('/api/leave')]);
    const first = me.fullName.split(' ')[0];
    const R = 62, C = 2 * Math.PI * R, pct = Math.max(0, Math.min(1, bal.balance / 30));
    const open = tickets.filter((t) => t.status !== 'closed');
    let staff = '';
    if (isStaff()) {
      const hc = await api('/api/reports/headcount');
      const max = Math.max(...hc.map((h) => h.headcount));
      staff = `<section class="panel"><h2>Headcount by department</h2><div class="bars">${hc.map((h) =>
        `<div class="bar"><span>${esc(h.department)}</span><span class="track"><i style="width:${(h.headcount / max) * 100}%"></i></span><b>${h.headcount}</b></div>`).join('')}</div></section>`;
    }
    return `
      <div class="page-head"><div><h1>Hello, ${esc(first)}</h1><p>${esc(me.department)} department</p></div>
        <a class="btn" href="#/tickets">New request</a></div>
      <div class="grid main-side">
        <section class="panel"><h2>Your leave</h2>
          <div class="balance">
            <div class="ring"><svg width="150" height="150" viewBox="0 0 150 150"><circle class="track" cx="75" cy="75" r="${R}"/><circle class="val" cx="75" cy="75" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
              <div class="ring-label"><span>${esc(bal.balance)}</span><small>days left</small></div></div>
            <div><p class="muted" style="margin:0 0 12px">${leaves.filter((l) => l.user_id === me.id && l.status === 'pending').length} pending request(s)</p>
              <a class="btn ghost" href="#/leave">Request time off</a></div>
          </div></section>
        <section class="panel"><h2>Open requests</h2>
          ${open.length ? `<ul class="list">${open.slice(0, 5).map((t) => `<li><div class="grow"><a href="/tickets/${t.id}/view">${esc(t.subject)}</a><small>${date(t.created_at)}</small></div>${chip(t.status)}</li>`).join('')}</ul>`
            : '<p class="empty">Nothing open. Create a request when you need help.</p>'}
        </section>
      </div>
      ${staff ? `<div style="margin-top:18px">${staff}</div>` : ''}`;
  },

  async tickets() {
    const list = await api('/api/tickets');
    return `
      <div class="page-head"><div><h1>Requests</h1><p>${isStaff() ? 'All requests from employees' : 'Your requests to HR and IT'}</p></div></div>
      <div class="grid main-side">
        <section class="panel"><h2>${isStaff() ? 'All requests' : 'My requests'}</h2>
          ${list.length ? `<ul class="list">${list.map((t) => `<li><div class="grow"><a href="/tickets/${t.id}/view">#${t.id} ${esc(t.subject)}</a><small>${date(t.created_at)}</small></div>${chip(t.status)}</li>`).join('')}</ul>`
            : '<p class="empty">No requests yet.</p>'}</section>
        <section class="panel"><h2>New request</h2>
          <form id="new-ticket"><label for="t-subject">Subject</label><input id="t-subject" required maxlength="120">
          <label for="t-body">Details</label><textarea id="t-body" required></textarea>
          <button class="btn" style="margin-top:14px">Create request</button></form></section>
      </div>`;
  },

  async directory() {
    return `
      <div class="page-head"><div><h1>Directory</h1><p>Find colleagues by name or department</p></div></div>
      <section class="panel"><form id="search" class="row"><label class="sr-only" for="q">Search</label><input id="q" placeholder="Search people" autocomplete="off"><button class="btn">Search</button></form>
      <ul class="list" id="people" style="margin-top:14px"></ul></section>`;
  },
  async directoryInit() {
    const run = async (q) => {
      try {
        const rows = q ? await api('/api/employees/search?q=' + encodeURIComponent(q)) : await api('/api/employees');
        $('#people').innerHTML = rows.length ? rows.map((p) => `<li>${person(p.full_name, p.email, '', p.avatar_url)}<div class="grow"><b>${esc(p.full_name)}</b><small>${esc(p.email)}</small></div><span class="chip">${esc(p.department)}</span></li>`).join('')
          : '<li class="empty" style="display:block">No one matches that search.</li>';
      } catch (e) { $('#people').innerHTML = `<li class="empty" style="display:block">${esc(e.message)}</li>`; }
    };
    $('#search').onsubmit = (e) => { e.preventDefault(); run($('#q').value.trim()); };
    run('');
  },

  async leave() {
    const [bal, reqs] = await Promise.all([api('/api/leave/balance'), api('/api/leave')]);
    const mine = reqs.filter((r) => r.user_id === me.id);
    const others = isStaff() ? reqs.filter((r) => r.user_id !== me.id && r.status === 'pending') : [];
    return `
      <div class="page-head"><div><h1>Time off</h1><p>Balance: <b>${esc(bal.balance)}</b> days</p></div></div>
      <div class="grid main-side">
        <section class="panel"><h2>My requests</h2>
          ${mine.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>${mine.map((r) =>
            `<tr><td>${date(r.created_at)}</td><td>${esc(r.days)}</td><td>${esc(r.reason || '-')}</td><td>${chip(r.status)}</td><td>${r.status === 'pending' ? `<button class="btn ghost small" data-cancel="${r.id}">Cancel</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="empty">You have not requested time off yet.</p>'}</section>
        <section class="panel"><h2>Request time off</h2>
          <form id="leave-form"><label for="days">Days</label><input id="days" type="number" step="1" required>
          <label for="reason">Reason</label><input id="reason" maxlength="120">
          <button class="btn" style="margin-top:14px">Submit request</button></form></section>
      </div>
      ${others.length ? `<section class="panel" style="margin-top:18px"><h2>Waiting for your decision</h2><div class="table-wrap"><table><thead><tr><th>Employee</th><th>Days</th><th>Reason</th><th></th></tr></thead><tbody>${others.map((r) =>
        `<tr><td>#${esc(r.user_id)}</td><td>${esc(r.days)}</td><td>${esc(r.reason || '-')}</td><td><button class="btn small" data-decide="${r.id}" data-approve="1">Approve</button> <button class="btn ghost small" data-decide="${r.id}">Reject</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  },

  async reports() {
    if (!isStaff()) return '<p class="empty">Reports are available to HR and admins.</p>';
    const hc = await api('/api/reports/headcount');
    const max = Math.max(...hc.map((h) => h.headcount));
    return `
      <div class="page-head"><div><h1>Reports</h1><p>Headcount and employee exports</p></div></div>
      <div class="grid two">
        <section class="panel"><h2>Headcount</h2><div class="bars">${hc.map((h) =>
          `<div class="bar"><span>${esc(h.department)}</span><span class="track"><i style="width:${(h.headcount / max) * 100}%"></i></span><b>${h.headcount}</b></div>`).join('')}</div></section>
        <section class="panel"><h2>Export employees</h2>
          <form id="export"><label for="dept">Department</label>
          <select id="dept"><option value="">All departments</option>${hc.map((h) => `<option>${esc(h.department)}</option>`).join('')}</select>
          <label for="rname">Archive name</label><input id="rname" value="employees-report">
          <button class="btn" style="margin-top:14px">Create archive</button></form>
          <pre class="out" id="export-out" hidden></pre></section>
      </div>`;
  },

  async admin() {
    if (me.role !== 'admin') return '<p class="empty">Only admins can manage users.</p>';
    const users = await api('/api/admin/users');
    return `
      <div class="page-head"><div><h1>Users</h1><p>Manage roles</p></div></div>
      <section class="panel"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Department</th><th>Role</th></tr></thead><tbody>${users.map((u) =>
        `<tr><td><div class="row" style="flex-wrap:nowrap">${person(u.full_name, u.email, '', u.avatar_url)}<div><b>${esc(u.full_name)}</b><br><small class="muted">${esc(u.email)}</small></div></div></td><td>${esc(u.department)}</td>
        <td><select data-role="${u.id}" aria-label="Role for ${esc(u.full_name)}" style="width:auto">${['employee', 'hr', 'admin'].map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></section>`;
  },

  async settings() {
    const [prof, prefs] = await Promise.all([api('/api/employees/' + me.id), api('/api/preferences').catch(() => ({}))]);
    const p = { theme: 'light', language: 'en', itemsPerPage: 20, ...prefs };
    return `
      <div class="page-head"><div><h1>Settings</h1><p>Your profile and preferences</p></div></div>
      <div class="grid two">
        <section class="panel"><h2>Profile</h2>
          <div class="row" style="flex-wrap:nowrap;margin-bottom:12px">${avatar(prof.full_name, 'lg', prof.avatar_url)}<div><b>${esc(prof.full_name)}</b><br><span class="muted">${esc(prof.email)}</span></div></div>
          <p class="muted" style="margin:4px 0">Phone: ${esc(prof.phone || '-')}</p><p class="muted" style="margin:4px 0">Department: ${esc(prof.department)}</p>
          <form id="avatar"><label for="avatar-url">Import photo from URL</label><input id="avatar-url" type="url" placeholder="https://">
          <button class="btn ghost" style="margin-top:12px">Import photo</button></form><pre class="out" id="avatar-out" hidden></pre></section>
        <section class="panel"><h2>Preferences</h2>
          <form id="prefs"><label for="theme">Theme</label><select id="theme"><option value="light" ${p.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${p.theme === 'dark' ? 'selected' : ''}>Dark</option></select>
          <label for="lang">Language</label><select id="lang">${[['en', 'English'], ['uk', 'Ukrainian'], ['de', 'Deutsch']].map(([v, n]) => `<option value="${v}" ${p.language === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <label for="ipp">Items per page</label><input id="ipp" type="number" min="5" max="100" value="${esc(p.itemsPerPage)}">
          <button class="btn" style="margin-top:14px">Save preferences</button></form></section>
      </div>`;
  },
};

/* ---------- interactions ---------- */
const handlers = {
  tickets() {
    $('#new-ticket').onsubmit = async (e) => {
      e.preventDefault();
      try { await send('/api/tickets', { subject: $('#t-subject').value, body: $('#t-body').value }); toast('Request created'); route(); }
      catch (err) { toast(err.message, true); }
    };
  },
  leave() {
    $('#leave-form').onsubmit = async (e) => {
      e.preventDefault();
      try { await send('/api/leave', { days: Number($('#days').value), reason: $('#reason').value }); toast('Request submitted'); route(); }
      catch (err) { toast(err.message, true); }
    };
    view.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = async () => {
      try { await send(`/api/leave/${b.dataset.cancel}/cancel`, {}); toast('Request cancelled'); route(); } catch (err) { toast(err.message, true); }
    }));
    view.querySelectorAll('[data-decide]').forEach((b) => (b.onclick = async () => {
      try { await send(`/api/leave/${b.dataset.decide}/decision`, { approve: !!b.dataset.approve }); toast(b.dataset.approve ? 'Approved' : 'Rejected'); route(); } catch (err) { toast(err.message, true); }
    }));
  },
  reports() {
    const f = $('#export'); if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const qs = new URLSearchParams({ name: $('#rname').value }); if ($('#dept').value) qs.set('department', $('#dept').value);
      try { const r = await api('/api/reports/export?' + qs); const o = $('#export-out'); o.hidden = false; o.textContent = `${r.archive} (${r.rows} rows)\n${r.details}`; toast('Archive created'); }
      catch (err) { toast(err.message, true); }
    };
  },
  admin() {
    view.querySelectorAll('[data-role]').forEach((s) => (s.onchange = async () => {
      try { await send(`/api/admin/users/${s.dataset.role}/role`, { role: s.value }); toast('Role updated'); } catch (err) { toast(err.message, true); }
    }));
  },
  settings() {
    $('#prefs').onsubmit = async (e) => {
      e.preventDefault();
      try { const r = await send('/api/preferences', { theme: $('#theme').value, language: $('#lang').value, itemsPerPage: Number($('#ipp').value) }); applyTheme(r.theme); toast('Preferences saved'); }
      catch (err) { toast(err.message, true); }
    };
    $('#avatar').onsubmit = async (e) => {
      e.preventDefault();
      try { const r = await send(`/api/employees/${me.id}/avatar-import`, { url: $('#avatar-url').value }); const o = $('#avatar-out'); o.hidden = false; o.textContent = `Imported (${r.status}, ${r.size} bytes)\n${r.preview}`; toast('Photo imported'); }
      catch (err) { toast(err.message, true); }
    };
  },
};

/* ---------- shell ---------- */
function applyTheme(t) { document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light'; }

function renderShell() {
  const items = [['dashboard', 'Home'], ['tickets', 'Requests'], ['directory', 'Directory'], ['leave', 'Time off']];
  const staff = [];
  if (isStaff()) staff.push(['reports', 'Reports']);
  if (me.role === 'admin') staff.push(['admin', 'Users']);
  const link = ([k, n]) => `<a href="#/${k}" data-k="${k}">${icon(k)}<span>${n}</span></a>`;
  $('#nav').innerHTML = items.map(link).join('') + (staff.length ? `<div class="nav-group">Management</div>` + staff.map(link).join('') : '') +
    '<div style="flex:1"></div>' + link(['settings', 'Settings']);
  $('#me').innerHTML = `${avatar(me.fullName, '', me.avatarUrl)}<div><b>${esc(me.fullName)}</b><small>${esc(me.role)}</small></div><button id="logout" title="Sign out" aria-label="Sign out">${icon('out')}</button>`;
  $('#logout').onclick = async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/'; };
}

async function route() {
  const key = (location.hash.replace('#/', '') || 'dashboard').split('?')[0];
  const name = pages[key] ? key : 'dashboard';
  document.querySelectorAll('#nav a').forEach((a) => (a.dataset.k === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  try {
    view.innerHTML = await pages[name]();
    document.title = 'Kadro - ' + name[0].toUpperCase() + name.slice(1);
    if (pages[name + 'Init']) await pages[name + 'Init']();
    if (handlers[name]) handlers[name]();
  } catch (err) { view.innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
}

(async function init() {
  me = await api('/api/auth/me');
  api('/api/preferences').then((p) => applyTheme(p.theme)).catch(() => {});
  renderShell();
  window.addEventListener('hashchange', route);
  route();
})();
