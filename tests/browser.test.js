// Uji browser headless (Chrome via DevTools Protocol), tanpa dependensi tambahan.
// Memeriksa: aturan akses, error console, overflow horizontal, interaksi penting,
// lalu menyimpan screenshot setiap halaman ke docs/screenshots/<nama-file>-<lebar>.png.
//
// Jalankan: node tests/browser.test.js
// Butuh Node 22+ (WebSocket bawaan), Google Chrome, dan internet (Bootstrap dari CDN).
// Lokasi Chrome bisa diganti lewat variabel lingkungan CHROME_PATH.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SHOTS = path.join(ROOT, 'docs', 'screenshots');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8765, DBG = 9333;
const BASE = `http://127.0.0.1:${PORT}/`;
fs.mkdirSync(SHOTS, { recursive: true });

// ----- Server statis lokal -----
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, BASE).pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(PORT);

// ----- Klien CDP sederhana -----
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const events = [];
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise(res => pending.set(id, res));
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval gagal: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
  return r.result.value;
}
async function go(url) {
  await send('Page.navigate', { url: BASE + url });
  await sleep(900); // load + latensi mock 150 ms + kemungkinan redirect
  return evaluate('location.pathname.slice(1) + location.search');
}
async function setSession(userId) {
  await go('index.html');
  await evaluate(userId ? `localStorage.setItem('cpf_session_v1','${userId}')` : `localStorage.removeItem('cpf_session_v1')`);
}
async function width(w, h) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h || (w < 500 ? 812 : w < 1000 ? 1024 : 800), deviceScaleFactor: 1, mobile: w < 500 });
}
const KEYS = { Tab: 9, Enter: 13, Escape: 27, ArrowDown: 40 };
async function press(key) {
  const base = { key, code: key, windowsVirtualKeyCode: KEYS[key], nativeVirtualKeyCode: KEYS[key] };
  await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, base, key === 'Enter' ? { text: '\r' } : {}));
  await send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
  await sleep(120);
}
async function clickAt(selector) {
  const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }
  await sleep(400);
}

// Simpan screenshot; coba ulang jika berkas sedang dibuka program lain (Windows mengunci berkas).
async function saveShot(file, data) {
  for (let i = 0; i < 5; i++) {
    try { fs.writeFileSync(file, Buffer.from(data, 'base64')); return; } catch (e) { await sleep(400); }
  }
  note(false, 'screenshot gagal disimpan (berkas dikunci program lain?): ' + path.basename(file));
}

const problems = [];
const report = [];
function note(ok, msg) { report.push((ok ? 'OK    ' : 'GAGAL ') + msg); if (!ok) problems.push(msg); }

(async () => {
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DBG}`,
    `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'cpf-chrome-'))}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) { /* tunggu */ }
  }
  if (!target) throw new Error('Chrome tidak bisa dijalankan. Atur CHROME_PATH.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.error ? { exceptionDetails: { exception: { description: msg.error.message } } } : (msg.result || {}));
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.exceptionThrown') events.push('EXCEPTION ' + (msg.params.exceptionDetails.exception || {}).description);
    else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(msg.params.type)) events.push('CONSOLE.' + msg.params.type + ' ' + msg.params.args.map(a => a.value || a.description).join(' '));
    else if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) events.push('LOG ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await width(1280);

  // ----- Data bersih -----
  await go('index.html');
  await evaluate('localStorage.clear(); sessionStorage.clear(); true');
  await go('index.html');
  note(await evaluate('typeof bootstrap === "object" && !!bootstrap.Modal'), 'Bootstrap JS dari CDN termuat (SRI valid)');
  note(await evaluate('getComputedStyle(document.querySelector(".btn")).borderRadius !== "0px"'), 'Bootstrap CSS dari CDN termuat');

  // Siapkan percakapan: Andi connect ke kampanye c_1 milik Citra, Citra menerima.
  await setSession('u_andi'); await go('dashboard.html');
  await evaluate(`Api.connect({type:'campaign',refId:'c_1'})`);
  await setSession('u_citra'); await go('dashboard.html');
  const inc = await evaluate('Api.listIncomingConnections()');
  const conv = await evaluate(`Api.respondConnection('${inc[0].id}', true)`);
  await evaluate(`Api.sendMessage('${conv.conversationId}', 'Halo! Masih butuh narasumber data & AI?')`);
  await setSession('u_andi'); await go('dashboard.html');
  await evaluate(`Api.sendMessage('${conv.conversationId}', 'Masih, kapan bisa wawancara? Kalimat ini sengaja dibuat cukup panjang supaya pembungkusan teks di layar sempit terlihat.')`);
  const chatId = conv.conversationId;

  // ===== 1. Aturan akses (redirect) =====
  const pages = ['index.html', 'auth.html', 'admin-login.html', 'profile.html', 'status.html', 'dashboard.html', 'campaign-new.html',
    'campaign.html?id=c_1', 'search.html?kategori=Semua&fakultas=Semua&gender=Random', 'partner.html?id=u_citra', 'chats.html', `chat.html?id=${chatId}`, 'notifications.html',
    'admin-queue.html', 'admin-review.html?id=u_dewi'];
  const expected = {
    guest: p => (['index', 'auth', 'admin-login'].includes(p) ? p : p.startsWith('admin') ? 'admin-login' : 'auth'),
    u_andi: p => (p === 'auth' || p === 'admin-login' || p.startsWith('admin') ? 'dashboard' : p),
    u_dewi: p => (p === 'index' ? 'index' : ['profile', 'status'].includes(p) ? p : 'status'),
    u_admin: p => (p === 'index' ? 'index' : p.startsWith('admin-') && p !== 'admin-login' ? p : 'admin-queue')
  };
  for (const role of Object.keys(expected)) {
    await setSession(role === 'guest' ? null : role);
    for (const url of pages) {
      const page = url.split(/[.?]/)[0];
      const landed = (await go(url)).split(/[.?]/)[0];
      note(landed === expected[role](page), `akses ${role.padEnd(7)} ${url.padEnd(28)} -> ${landed}`);
    }
  }

  // ===== 2. Screenshot + console + overflow di 3 lebar =====
  // Akun demo per halaman: Dewi (Menunggu) untuk Status, Citra (pemilik) untuk Detail Kampanye
  // dan Notifikasi agar daftar Respons/Connect terlihat, Admin untuk halaman admin, Andi untuk sisanya.
  const roleFor = p => (['index.html', 'auth.html', 'admin-login.html'].includes(p) ? null
    : p.startsWith('admin') ? 'u_admin' : p === 'status.html' ? 'u_dewi'
      : p.startsWith('campaign.html') || p === 'notifications.html' ? 'u_citra' : 'u_andi');
  for (const w of [375, 768, 1280]) {
    await width(w);
    for (const url of pages) {
      await setSession(roleFor(url));
      events.length = 0;
      const landed = await go(url);
      await sleep(250);
      const m = await evaluate('({sw: document.documentElement.scrollWidth, iw: window.innerWidth, h: Math.min(document.documentElement.scrollHeight, 5000)})');
      const name = url.split(/[.?]/)[0];
      note(landed.split(/[.?]/)[0] === name, `screenshot ${name}-${w} dibuka tanpa redirect`);
      note(m.sw <= m.iw, `overflow ${w}px ${name}: scrollWidth ${m.sw} <= ${m.iw}`);
      note(events.length === 0, `console ${w}px ${name}${events.length ? ': ' + events.join(' | ') : ''}`);
      await width(w, m.h);
      await sleep(200);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await saveShot(path.join(SHOTS, `${name}-${w}.png`), shot.data);
      await width(w);
    }
  }

  // ===== 3. Daftar fakultas & kategori di UI =====
  await width(1280);
  await setSession('u_andi');
  await go('profile.html');
  note(await evaluate(`document.querySelectorAll('#fakultas option:not([value=""])').length === 17`), 'profil: dropdown fakultas berisi 17 entri');
  note(await evaluate(`document.querySelectorAll('#kategori-group input[type=checkbox]').length === 4 && !document.querySelector('#kategori-group input[type=radio]')`), 'profil: kategori berupa 4 checkbox');
  note(await evaluate(`document.querySelectorAll('#kategori-group input:checked').length === 2`), 'profil: Andi memilih 2 kategori (seed)');
  // Kosongkan semua kategori -> ditolak
  await evaluate(`document.querySelectorAll('#kategori-group input').forEach(c => c.checked = false); document.getElementById('submit-btn').click()`);
  await sleep(300);
  note(await evaluate(`document.getElementById('kategori-error').classList.contains('d-block') && document.getElementById('kategori-error').textContent.includes('minimal satu')`), 'profil: kategori kosong ditolak');
  // Pilih 3 kategori -> tersimpan
  await evaluate(`['Interview','Project','Lomba'].forEach(v => document.querySelector('#kategori-group input[value="' + v + '"]').checked = true); document.getElementById('submit-btn').click()`);
  await sleep(700);
  note(await evaluate(`!!document.querySelector('.toast.show')`), 'profil: 3 kategori tersimpan (toast sukses)');
  await go('search.html');
  note(await evaluate(`document.querySelectorAll('#f-fakultas option').length === 18 && document.querySelector('#f-fakultas option').value === 'Semua'`), 'cari: filter fakultas = Semua + 17 entri');
  await setSession('u_citra');
  await go('partner.html?id=u_andi');
  note(await evaluate(`[...document.querySelectorAll('#partner-content .tag')].map(b => b.textContent).join('|') === 'Interview|Project|Lomba'`), 'Profil Partner: kategori tampil sebagai 3 tag terpisah');
  await go('search.html?kategori=Project&fakultas=Semua&gender=Random');
  await sleep(300);
  const cards = await evaluate(`[...document.querySelectorAll('#result-list article')].map(a => ({label: a.querySelector('h3').textContent, badges: a.querySelectorAll('.tag').length}))`);
  note(cards.some(c => c.label === 'Anonim #A1B2' && c.badges === 3), 'kartu hasil: Andi muncul di filter Project dengan 3 tag');

  // ===== 4. Interaksi =====
  // 4a. Menu akun dengan keyboard di 1280px: Tab sampai tombol akun, Enter buka, Esc tutup.
  await setSession('u_andi');
  await go('dashboard.html');
  await evaluate('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)');
  let reached = false;
  for (let i = 0; i < 15 && !reached; i++) {
    await press('Tab');
    reached = await evaluate(`document.activeElement.id === 'nav-account'`);
  }
  note(reached, 'keyboard: tombol menu akun bisa dicapai dengan Tab');
  await press('Enter');
  note(await evaluate(`document.querySelector('#nav-account + .dropdown-menu').classList.contains('show')`), 'keyboard: Enter membuka menu akun');
  await press('ArrowDown');
  note(await evaluate(`document.activeElement.classList.contains('dropdown-item')`), 'keyboard: panah bawah memindahkan fokus ke item menu');
  await press('Escape');
  note(await evaluate(`!document.querySelector('#nav-account + .dropdown-menu').classList.contains('show') && document.activeElement.id === 'nav-account'`), 'keyboard: Esc menutup menu dan fokus kembali ke tombol');
  await press('Enter');
  await press('Tab');
  note(await evaluate(`document.activeElement.textContent.trim() === 'Profil'`), 'keyboard: Tab ke item Profil');
  await press('Enter');
  await sleep(800);
  note((await evaluate('location.pathname')).endsWith('profile.html'), 'keyboard: Enter pada Profil membuka profile.html');

  // 4b. Mobile 375px: toggler -> menu akun -> item tidak tertutup dan bisa diklik
  await width(375);
  await go('dashboard.html');
  note(await evaluate(`getComputedStyle(document.querySelector('.navbar-toggler')).display !== 'none'`), 'mobile: tombol toggler tampil');
  await clickAt('.navbar-toggler');
  note(await evaluate(`document.getElementById('nav-collapse').classList.contains('show')`), 'mobile: toggler membuka menu');
  await clickAt('#nav-account');
  note(await evaluate(`document.getElementById('nav-collapse').classList.contains('show') && document.querySelector('#nav-account + .dropdown-menu').classList.contains('show')`), 'mobile: menu akun terbuka, navbar tetap terbuka');
  const covered = await evaluate(`[...document.querySelectorAll('#nav-collapse a, #nav-collapse button')].filter(el => {
      const r = el.getBoundingClientRect(); if (!r.width) return true;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !(hit === el || el.contains(hit));
    }).map(el => el.textContent.trim())`);
  note(covered.length === 0, 'mobile: semua item navbar terlihat & bisa diklik' + (covered.length ? ' (tertutup: ' + covered.join(', ') + ')' : ''));
  await clickAt('#nav-collapse .dropdown-item[href="status.html"]');
  await sleep(600);
  note((await evaluate('location.pathname')).endsWith('status.html'), 'mobile: klik Status Verifikasi membuka status.html');
  await width(1280);

  // 4c. Admin login lewat auth.html -> pesan + tautan, tidak redirect
  await setSession(null);
  await go('auth.html');
  note(await evaluate(`[...document.querySelectorAll('a[href="admin-login.html"]')].some(a => a.textContent.trim() === 'Login admin')`), 'auth.html: ada tautan "Login admin"');
  await evaluate(`document.getElementById('login-email').value='admin@ub.ac.id'; document.getElementById('login-password').value='admin123'; document.querySelector('#login-form button[type=submit]').click()`);
  await sleep(700);
  note((await evaluate('location.pathname')).endsWith('auth.html') && (await evaluate('Api.me()')) === null, 'admin via auth.html: tetap di halaman, tidak login');
  note(await evaluate(`document.getElementById('login-alert').textContent.toLowerCase().includes('login admin') && !!document.getElementById('admin-login-hint')`), 'admin via auth.html: pesan + tautan ke Login admin');
  await go('admin-login.html');
  await evaluate(`document.getElementById('login-email').value='admin@ub.ac.id'; document.getElementById('login-password').value='admin123'; document.querySelector('#login-form button[type=submit]').click()`);
  await sleep(800);
  note((await evaluate('location.pathname')).endsWith('admin-queue.html'), 'admin-login.html: admin masuk ke Antrean KTM');

  // 4d. Validasi form kampanye (tanpa alert())
  await setSession('u_andi');
  await go('campaign-new.html');
  await evaluate(`window.__alerts=0; window.alert=()=>{window.__alerts++}; document.querySelector('#campaign-form button[type=submit]').click()`);
  await sleep(200);
  note(await evaluate(`document.querySelectorAll('#campaign-form .is-invalid').length === 2 && window.__alerts === 0`), 'validasi kampanye kosong: 2 field merah, tanpa alert()');
  await evaluate(`deskripsi.value='terlalu pendek'; benefit.value='Camilan'; document.querySelector('#campaign-form button[type=submit]').click()`);
  await sleep(200);
  note((await evaluate(`document.getElementById('deskripsi-error').textContent`)).includes('20'), 'validasi deskripsi < 20 karakter');

  // 4e. Chat -> Deal lewat modal -> Diambil
  await go(`chat.html?id=${chatId}`);
  await evaluate(`document.getElementById('message-input').value='Oke, besok jam 10 ya'; document.querySelector('#message-form button').click()`);
  await sleep(700);
  note(await evaluate(`document.querySelectorAll('.msg').length === 3`), 'chat: kirim pesan menambah bubble');
  await evaluate(`document.getElementById('deal-btn').click()`); await sleep(600);
  note(await evaluate(`document.getElementById('deal-modal').classList.contains('show')`), 'chat: modal konfirmasi Deal terbuka');
  await evaluate(`document.getElementById('confirm-deal-btn').click()`); await sleep(900);
  note(await evaluate(`document.getElementById('message-input').disabled && document.getElementById('deal-btn').disabled && document.getElementById('deal-status').textContent.includes('Diambil')`), 'chat: setelah Deal input & tombol nonaktif, banner Diambil');
  await setSession('u_eko');
  await go('campaign.html?id=c_1');
  note(await evaluate(`[...document.querySelectorAll('button')].some(b => b.disabled && b.textContent.includes('Sudah Diambil'))`), 'kampanye: pengguna lain melihat "Sudah Diambil" nonaktif');

  // 4f. Admin approve
  await setSession('u_admin');
  await go('admin-review.html?id=u_dewi');
  await evaluate(`document.querySelector('[data-decision="Disetujui"]').click()`); await sleep(900);
  note((await evaluate('location.pathname')).endsWith('admin-queue.html'), 'admin: approve kembali ke antrean');

  // 4f2. Gerak: catatan ditempel, garis penghubung, cap Diambil, dan reduced motion
  await setSession('u_andi');
  await send('Page.navigate', { url: BASE + 'dashboard.html' });
  await sleep(450);
  note(await evaluate(`document.querySelectorAll('#campaign-list .note').length >= 2 && document.getElementById('campaign-list').classList.contains('is-pinning') && document.querySelector('#campaign-list .note').getAnimations().length > 0`), 'gerak: catatan di papan ditempel dengan animasi');
  await sleep(1200);
  note(await evaluate(`[...document.querySelectorAll('#campaign-list .note')].every(n => getComputedStyle(n).opacity === '1')`), 'gerak: setelah animasi semua catatan terlihat penuh');
  note(await evaluate(`[...document.querySelectorAll('#campaign-list .note')].some(n => n.querySelector('.stamp'))`), 'papan: catatan yang Diambil memakai cap');
  // Connect dari pengunjung menggambar garis ke kolom samping
  await setSession('u_andi');
  await go('campaign.html?id=c_2');
  await evaluate(`document.getElementById('connect-btn').click()`);
  await sleep(450);
  note(await evaluate(`document.querySelectorAll('#campaign-content .connector path').length === 1 && document.querySelector('#campaign-content .connector path').getAnimations().length > 0`), 'gerak: Connect menggambar garis penghubung');
  // Pemilik melihat garis ke setiap respons
  await setSession('u_eko');
  await go('campaign.html?id=c_2');
  note(await evaluate(`document.querySelectorAll('#campaign-content .connector path').length === 1 && !!document.querySelector('.response [data-respond]')`), 'pemilik: garis ke kartu respons + tombol Terima/Tolak');
  // Terima: kartu berubah ke Terhubung sebelum obrolan dibuka
  await evaluate(`document.querySelector('.response [data-accept="1"]').click()`);
  await sleep(350);
  note(await evaluate(`!!document.querySelector('.response.is-connected .check-mark.is-popping') && document.querySelector('.response.is-connected').textContent.includes('Terhubung')`), 'gerak: Terima mengubah kartu menjadi Terhubung dengan centang');
  await sleep(900);
  note((await evaluate('location.pathname')).endsWith('chat.html'), 'Terima lalu membuka obrolan');
  // Deal dengan animasi cap
  await evaluate(`document.getElementById('deal-btn').click()`); await sleep(600);
  await evaluate(`document.getElementById('confirm-deal-btn').click()`); await sleep(500);
  note(await evaluate(`!!document.querySelector('#source-card .stamp') && document.querySelector('#source-card .stamp').getAnimations().length > 0`), 'gerak: cap Diambil menempel di kartu asal dengan animasi');
  // Reduced motion: tidak ada animasi, status akhir tetap terlihat
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await go('dashboard.html');
  note(await evaluate(`[...document.querySelectorAll('#campaign-list .note')].every(n => n.getAnimations().length === 0 && getComputedStyle(n).opacity === '1')`), 'reduced motion: papan tanpa animasi, semua catatan terlihat');
  await go('campaign.html?id=c_2');
  note(await evaluate(`!!document.querySelector('#detail-note .stamp') && document.querySelector('#detail-note .stamp').getAnimations().length === 0 && getComputedStyle(document.querySelector('#detail-note .stamp')).opacity === '1'`), 'reduced motion: cap Diambil tampil tanpa animasi');
  await send('Emulation.setEmulatedMedia', { features: [] });

  // 4g. Keluar
  await setSession('u_andi');
  await go('dashboard.html');
  await evaluate(`document.getElementById('nav-logout').click()`); await sleep(800);
  note((await evaluate('location.pathname')).endsWith('index.html') && (await evaluate('Api.me()')) === null, 'Keluar -> index.html dan sesi berakhir');

  console.log(report.filter(l => l.startsWith('GAGAL')).join('\n') || '(tidak ada yang gagal)');
  console.log(`\nTotal ${report.length} pemeriksaan, gagal ${problems.length}. Screenshot: ${path.relative(ROOT, SHOTS)}`);
  ws.close(); chrome.kill(); server.close();
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
