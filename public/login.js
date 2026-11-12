const $ = (id) => document.getElementById(id);
const post = (u, b) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
  .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

$('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('err').textContent = '';
  const { ok, data } = await post('/api/auth/login', { email: $('email').value.trim(), password: $('password').value });
  if (ok) location.href = '/app.html'; else $('err').textContent = data.error || 'Could not sign in';
});

const show = (which) => { $('login').hidden = which !== 'login'; $('forgot').hidden = which !== 'forgot'; };
$('to-forgot').onclick = () => show('forgot');
$('to-login').onclick = () => show('login');

let codeSent = false;
$('forgot').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('f-err').textContent = '';
  if (!codeSent) {
    const { data } = await post('/api/auth/forgot', { email: $('f-email').value.trim() });
    codeSent = true;
    $('reset-fields').hidden = false;
    $('forgot-help').textContent = data.message;
    $('f-submit').textContent = 'Update password';
    return;
  }
  const { ok, data } = await post('/api/auth/reset', { email: $('f-email').value.trim(), code: $('f-code').value.trim(), newPassword: $('f-pass').value });
  if (ok) { show('login'); $('err').textContent = ''; $('email').value = $('f-email').value; $('password').focus(); }
  else $('f-err').textContent = data.error || 'Could not reset password';
});
