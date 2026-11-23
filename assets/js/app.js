/*
 * app.js — Kerangka aplikasi: penjaga akses, navigasi, komponen tampilan, dan gerak.
 *
 * Setiap halaman memanggil App.init(callback). Atribut pada <body>:
 *   data-page   : nama halaman (dipakai untuk menandai menu aktif)
 *   data-access : public | auth | approved | admin
 *
 * Callback dipanggil dengan objek akun (atau null) setelah akses diizinkan.
 */
(function (global) {
  'use strict';

  var FLASH_KEY = 'cpf_flash';

  // Halaman yang boleh dibuka mahasiswa yang belum disetujui.
  var RESTRICTED_PAGES = ['profile', 'status'];

  // ---------------------------------------------------------------------------
  // Utilitas umum
  // ---------------------------------------------------------------------------

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function param(name) {
    return new URLSearchParams(global.location.search).get(name);
  }

  function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', pukul ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
    if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
    return Math.floor(diff / 86400) + ' hari lalu';
  }

  // Hash string sederhana (FNV-1a) untuk gaya catatan & avatar yang konsisten.
  function hash(str) {
    var h = 2166136261;
    str = String(str || '');
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // Ke mana pengguna diarahkan setelah masuk atau saat aksesnya ditolak.
  function homeFor(user) {
    if (!user) return 'index.html';
    if (user.role === 'admin') return 'admin-queue.html';
    if (user.status === 'Disetujui') return 'dashboard.html';
    if (!user.profileComplete) return 'profile.html';
    return 'status.html';
  }

  function go(url) {
    global.location.replace(url);
  }

  // ---------------------------------------------------------------------------
  // Penjaga akses (aturan navigasi laporan 4.1.c)
  // ---------------------------------------------------------------------------

  // Mengembalikan URL tujuan redirect, atau null jika akses diizinkan.
  function guard(access, page, user) {
    if (access === 'public') {
      // Pengguna yang sudah masuk tidak perlu melihat form masuk lagi.
      if (user && (page === 'auth' || page === 'admin-login')) return homeFor(user);
      return null;
    }
    if (access === 'admin') {
      if (!user) return 'admin-login.html';
      if (user.role !== 'admin') return homeFor(user);
      return null;
    }
    // auth & approved: khusus mahasiswa
    if (!user) return 'auth.html';
    if (user.role === 'admin') return 'admin-queue.html';
    if (access === 'approved' && user.status !== 'Disetujui') {
      return user.profileComplete ? 'status.html' : 'profile.html';
    }
    if (access === 'auth' && user.status !== 'Disetujui' && RESTRICTED_PAGES.indexOf(page) === -1) {
      return homeFor(user);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Ikon SVG (garis 1.5 px, warna mengikuti teks)
  // ---------------------------------------------------------------------------

  var ICONS = {
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10.5 5 7 4.5 7 6.5S10 8 12 8Zm0 0c1.5-3 5-3.5 5-1.5S14 8 12 8Z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    chat: '<path d="M4 5.5h16v11H9.5L5 20v-3.5H4Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8.5" r="3.75"/><path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/>',
    logout: '<path d="M14 4.5h5v15h-5M10.5 8 6.5 12l4 4M6.5 12h10"/>',
    filter: '<path d="M4 6.5h16M7 12h10M10 17.5h4"/>',
    send: '<path d="m4.5 12 15-7-5.5 15-2.5-6Z"/><path d="m12 14 7.5-9"/>',
    alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V13M12 16.25v.25"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.75V8"/>',
    note: '<path d="M5 4.5h14v10l-5 5H5Z"/><path d="M14 19.5v-5h5"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M6 15.5c.6-1.3 1.5-2 2.5-2s1.9.7 2.5 2M14 10h4M14 13.5h3"/>',
    upload: '<path d="M12 15V4.5M8 8.5l4-4 4 4M5 14.5v5h14v-5"/>',
    link: '<path d="M10 14l4-4M9.5 7l1.8-1.8a3.5 3.5 0 0 1 5 5L14.5 12M14.5 17l-1.8 1.8a3.5 3.5 0 0 1-5-5L9.5 12"/>'
  };

  function icon(name, extraClass) {
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  // ---------------------------------------------------------------------------
  // Avatar geometris dari ID pengguna (bukan inisial)
  // ---------------------------------------------------------------------------

  var AVATAR_COLORS = ['#1C1B2E', '#0F8F7A', '#E5412D', '#FFD23F'];

  function avatar(seed, size) {
    size = size || 44;
    var h = hash('avatar:' + seed);
    function next() {
      // xorshift32: deretan angka semu yang konsisten untuk seed yang sama
      h ^= h << 13; h >>>= 0;
      h ^= h >>> 17;
      h ^= h << 5; h >>>= 0;
      return h;
    }
    var shapes = '';
    var prev = -1;
    for (var cell = 0; cell < 4; cell++) {
      var x = (cell % 2) * 24;
      var y = Math.floor(cell / 2) * 24;
      var cx = x + 12;
      var cy = y + 12;
      var color = next() % AVATAR_COLORS.length;
      if (color === prev) color = (color + 1) % AVATAR_COLORS.length;
      prev = color;
      var fill = AVATAR_COLORS[color];
      var rot = 'transform="rotate(' + ((next() % 4) * 90) + ' ' + cx + ' ' + cy + ')"';
      var kind = next() % 5;
      if (kind === 0) {
        shapes += '<circle cx="' + cx + '" cy="' + cy + '" r="9.5" fill="' + fill + '"/>';
      } else if (kind === 1) {
        shapes += '<path d="M' + x + ' ' + y + 'h24a24 24 0 0 1-24 24Z" fill="' + fill + '" ' + rot + '/>';
      } else if (kind === 2) {
        shapes += '<path d="M' + x + ' ' + y + 'h24L' + x + ' ' + (y + 24) + 'Z" fill="' + fill + '" ' + rot + '/>';
      } else if (kind === 3) {
        shapes += '<path d="M' + x + ' ' + (y + 24) + 'a12 12 0 0 1 24 0Z" fill="' + fill + '" ' + rot + '/>';
      } else {
        shapes += '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="16" height="16" fill="' + fill + '" ' + rot + '/>';
      }
    }
    return '<svg class="avatar" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<rect width="48" height="48" rx="8" fill="#FFFFFF"/>' +
      shapes +
      '<rect x="0.75" y="0.75" width="46.5" height="46.5" rx="7.5" fill="none" stroke="#1C1B2E" stroke-opacity="0.2" stroke-width="1.5"/>' +
      '</svg>';
  }

  // ---------------------------------------------------------------------------
  // Catatan kampanye & cap "Diambil"
  // ---------------------------------------------------------------------------

  var TILTS = [-2.6, -1.5, -0.7, 0.8, 1.6, 2.4];
  var TONES = ['white', 'yellow', 'mint'];

  /**
   * Ukuran mengikuti panjang deskripsi; warna & kemiringan diturunkan dari pembuat
   * dan ukuran, sehingga pratinjau di Pasang kampanye sama persis dengan di papan.
   */
  function noteStyle(ownerLabel, length) {
    var size = length < 90 ? 'sm' : length > 170 ? 'lg' : 'md';
    var h = hash(ownerLabel + '|' + size);
    return { size: size, tone: TONES[h % TONES.length], tilt: TILTS[(h >>> 3) % TILTS.length] };
  }

  function stampHTML(small) {
    return '<span class="stamp' + (small ? ' stamp--sm' : '') + '">' + icon('check') + 'Diambil</span>';
  }

  /**
   * HTML catatan kampanye.
   * opsi: i (urutan untuk animasi tempel), variant ('board' | 'detail'), link (bool), headingTag
   */
  function noteHTML(c, o) {
    o = o || {};
    var st = noteStyle(c.ownerLabel, (c.deskripsi || '').length);
    var detail = o.variant === 'detail';
    var taken = c.status === 'Diambil';
    var tag = o.headingTag || (detail ? 'h1' : 'h3');
    var cls = 'note note--' + (detail ? 'detail' : st.size) +
      (st.tone !== 'white' ? ' note--' + st.tone : '') + (taken ? ' is-taken' : '');
    var text = escapeHtml(c.deskripsi);
    if (o.link) text = '<a class="stretched-link" href="campaign.html?id=' + encodeURIComponent(c.id) + '">' + text + '</a>';
    var meta = [c.ownerFakultas, c.createdAt ? timeAgo(c.createdAt) : ''].filter(Boolean).join(', ');
    return '<article class="' + cls + '" style="--tilt:' + st.tilt + 'deg;--i:' + (o.i || 0) + '"' +
      (o.id ? ' id="' + o.id + '"' : '') + '>' +
      (taken ? stampHTML(false) : '') +
      '<header class="note-head">' + avatar(c.ownerLabel, detail ? 52 : 40) +
      '<div><p class="note-author">' + escapeHtml(c.ownerLabel) + (c.isOwner ? ' (Anda)' : '') + '</p>' +
      '<p class="note-meta">' + escapeHtml(meta) + '</p></div></header>' +
      '<' + tag + ' class="note-text">' + text + '</' + tag + '>' +
      '<p class="note-benefit">' + icon('gift') + '<span><span class="visually-hidden">Benefit: </span>' +
      escapeHtml(c.benefit) + '</span></p>' +
      '</article>';
  }

  /** Menjalankan animasi "ditempel satu per satu" sekali saja pada sebuah papan. */
  function pinBoard(container) {
    if (!container || reducedMotion()) return;
    var count = container.querySelectorAll('.note').length;
    container.classList.add('is-pinning');
    setTimeout(function () { container.classList.remove('is-pinning'); }, 600 + count * 80 + 100);
  }

  /** Cap "Diambil" menempel: scale 1.4 → 1, lalu getaran kecil pada kartunya. */
  function stampIn(stampEl, targetEl) {
    if (!stampEl || reducedMotion() || !stampEl.animate) return Promise.resolve();
    return stampEl.animate(
      [{ opacity: 0, scale: 1.4 }, { opacity: 1, offset: 0.7 }, { opacity: 1, scale: 1 }],
      { duration: 320, easing: 'cubic-bezier(.2,.9,.25,1.2)', fill: 'both' }
    ).finished.then(function () {
      if (!targetEl) return;
      return targetEl.animate(
        [{ translate: '0 0' }, { translate: '-2px 1px' }, { translate: '2px -1px' }, { translate: '-1px 0' }, { translate: '0 0' }],
        { duration: 120, easing: 'linear' }
      ).finished;
    }).catch(function () { /* animasi dibatalkan: abaikan */ });
  }

  /** Menggambar garis SVG dari awal ke akhir (stroke-dashoffset). */
  function drawPath(path, duration) {
    if (!path || !path.getTotalLength) return;
    if (reducedMotion() || !path.animate) return;
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: duration || 400, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
  }

  // ---------------------------------------------------------------------------
  // Navigasi
  // ---------------------------------------------------------------------------

  function navLink(href, label, page, current, extra) {
    var active = page === current;
    return '<li class="nav-item"><a class="nav-link' + (active ? ' active' : '') + '"' +
      (active ? ' aria-current="page"' : '') + ' href="' + href + '">' + label + (extra || '') + '</a></li>';
  }

  function dropItem(href, label, active, iconName) {
    return '<li><a class="dropdown-item' + (active ? ' active' : '') + '"' +
      (active ? ' aria-current="page"' : '') + ' href="' + href + '">' + icon(iconName) + label + '</a></li>';
  }

  function logoutItem() {
    return '<li class="nav-item"><a class="nav-link" href="index.html" id="nav-logout">' + icon('logout') + 'Keluar</a></li>';
  }

  var BRAND_MARK =
    '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<rect x="6" y="6" width="20" height="20" rx="2" fill="#FFD23F" stroke="#1C1B2E" stroke-width="1.5" transform="rotate(-7 16 16)"/>' +
    '<path d="M11 14h10M11 18.5h7" stroke="#1C1B2E" stroke-width="1.5" stroke-linecap="round" transform="rotate(-7 16 16)"/>' +
    '</svg>';

  function renderNav(user, page) {
    var header = document.getElementById('app-nav');
    if (!header) return;

    var brandHref = user ? homeFor(user) : 'index.html';
    var left = '';
    var right = '';

    if (!user) {
      right =
        '<li class="nav-item"><a class="nav-link" href="auth.html?tab=masuk">Masuk</a></li>' +
        '<li class="nav-item ms-lg-2"><a class="btn btn-primary btn-sm my-2 my-lg-0" href="auth.html?tab=daftar">Daftar</a></li>';
    } else if (user.role === 'admin') {
      left = navLink('admin-queue.html', 'Antrean KTM', 'admin-queue', page === 'admin-review' ? 'admin-queue' : page);
      right = '<li class="nav-item"><span class="nav-link pe-none">Admin</span></li>' + logoutItem();
    } else if (user.status !== 'Disetujui') {
      right =
        navLink('profile.html', 'Profil', 'profile', page) +
        navLink('status.html', 'Status verifikasi', 'status', page) +
        logoutItem();
    } else {
      left =
        navLink('dashboard.html', 'Papan kampanye', 'dashboard', page === 'campaign' ? 'dashboard' : page) +
        navLink('campaign-new.html', 'Pasang kampanye', 'campaign-new', page) +
        navLink('search.html', 'Cari partner', 'search', page === 'partner' ? 'search' : page);
      // Navigasi global: Notifikasi & Obrolan langsung terlihat,
      // Profil / Status verifikasi / Keluar dikelompokkan di menu akun.
      var accountActive = page === 'profile' || page === 'status';
      right =
        navLink('notifications.html', 'Notifikasi', 'notifications', page,
          '<span class="count-badge d-none" id="nav-unread"></span>') +
        navLink('chats.html', 'Obrolan', 'chats', page === 'chat' ? 'chats' : page) +
        '<li class="nav-item dropdown">' +
        // <button> asli: Tab untuk fokus, Enter/Spasi membuka, Esc menutup (ditangani Bootstrap).
        '<button type="button" class="nav-link dropdown-toggle' + (accountActive ? ' active' : '') + '" id="nav-account" ' +
        'data-bs-toggle="dropdown" aria-expanded="false" aria-label="Menu akun ' + escapeHtml(user.label) + '">' +
        avatar(user.label, 28) + escapeHtml(user.label) + '</button>' +
        '<ul class="dropdown-menu dropdown-menu-lg-end" aria-labelledby="nav-account">' +
        dropItem('profile.html', 'Profil', page === 'profile', 'user') +
        dropItem('status.html', 'Status verifikasi', page === 'status', 'card') +
        '<li><hr class="dropdown-divider"></li>' +
        '<li><a class="dropdown-item" href="index.html" id="nav-logout">' + icon('logout') + 'Keluar</a></li>' +
        '</ul></li>';
    }

    var who = user && user.role === 'mahasiswa' && user.status !== 'Disetujui'
      ? '<span class="navbar-text small-text muted d-flex align-items-center gap-2 me-lg-2">' +
        avatar(user.label, 24) + escapeHtml(user.label) + '</span>'
      : '';

    header.innerHTML =
      '<nav class="navbar navbar-expand-lg app-navbar" aria-label="Navigasi utama">' +
      '<div class="container">' +
      '<a class="app-brand" href="' + brandHref + '">' + BRAND_MARK + 'Campus Partner Finder</a>' +
      '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav-collapse" ' +
      'aria-controls="nav-collapse" aria-expanded="false" aria-label="Buka menu navigasi">' +
      '<span class="navbar-toggler-icon"></span></button>' +
      '<div class="collapse navbar-collapse" id="nav-collapse">' +
      '<ul class="navbar-nav me-auto">' + left + '</ul>' +
      who +
      '<ul class="navbar-nav align-items-lg-center">' + right + '</ul>' +
      '</div></div></nav>';

    var logout = document.getElementById('nav-logout');
    if (logout) {
      logout.addEventListener('click', function (e) {
        e.preventDefault();
        Api.logout().then(function () { global.location.href = 'index.html'; });
      });
    }
  }

  function refreshBadge() {
    var badge = document.getElementById('nav-unread');
    if (!badge) return Promise.resolve();
    return Api.unreadCount().then(function (count) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.toggle('d-none', count === 0);
      badge.setAttribute('aria-label', count + ' notifikasi belum dibaca');
    }).catch(function () { /* badge bersifat tambahan, abaikan kegagalan */ });
  }

  // ---------------------------------------------------------------------------
  // Umpan balik: toast, alert, validasi form
  // ---------------------------------------------------------------------------

  function toastContainer() {
    var box = document.getElementById('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      box.setAttribute('aria-live', 'polite');
      box.setAttribute('aria-atomic', 'true');
      document.body.appendChild(box);
    }
    return box;
  }

  /** Menampilkan toast. type: success | danger | info */
  function toast(message, type) {
    type = type || 'success';
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    var ic = type === 'danger' ? 'alert' : type === 'info' ? 'info' : 'check';
    el.innerHTML =
      '<div class="d-flex align-items-center"><div class="toast-body flex-grow-1">' + icon(ic) +
      '<span>' + escapeHtml(message) + '</span></div>' +
      '<button type="button" class="btn-close btn-close-white me-1" data-bs-dismiss="toast" aria-label="Tutup"></button></div>';
    toastContainer().appendChild(el);
    var t = global.bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 });
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
    t.show();
  }

  /** Menyimpan pesan toast untuk ditampilkan di halaman berikutnya (setelah redirect). */
  function flash(message, type) {
    try {
      global.sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message: message, type: type || 'success' }));
    } catch (e) { /* abaikan */ }
  }

  function consumeFlash() {
    try {
      var raw = global.sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      global.sessionStorage.removeItem(FLASH_KEY);
      var f = JSON.parse(raw);
      toast(f.message, f.type);
    } catch (e) { /* abaikan */ }
  }

  /** Menampilkan pesan kesalahan di dalam elemen target. */
  function showError(target, message) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return;
    el.innerHTML =
      '<div class="alert alert-danger" role="alert">' + icon('alert') +
      '<div>' + escapeHtml(message) + '</div></div>';
    el.scrollIntoView({ block: 'nearest' });
  }

  function clearError(target) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el) el.innerHTML = '';
  }

  /** Menandai field tidak valid dan mengisi pesan .invalid-feedback miliknya. */
  function fieldError(input, message) {
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    var fb = document.getElementById(input.id + '-error');
    if (fb) {
      fb.textContent = message;
      input.setAttribute('aria-describedby', fb.id);
    }
  }

  function clearFieldErrors(form) {
    Array.prototype.forEach.call(form.querySelectorAll('.is-invalid'), function (el) {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
    });
  }

  /** Fokus ke field pertama yang tidak valid. */
  function focusFirstInvalid(form) {
    var first = form.querySelector('.is-invalid');
    if (first) first.focus();
  }

  /** Menonaktifkan tombol dan menampilkan spinner selama proses. */
  function busy(button, isBusy, busyText) {
    if (!button) return;
    if (isBusy) {
      button.dataset.label = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>' +
        escapeHtml(busyText || 'Memproses...');
    } else {
      button.disabled = false;
      if (button.dataset.label) button.innerHTML = button.dataset.label;
    }
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
  }

  // ---------------------------------------------------------------------------
  // Komponen tampilan kecil
  // ---------------------------------------------------------------------------

  /** Label status: titik berwarna + teks. Warna: kuning = menunggu, hijau = aktif, merah = ditolak/diambil. */
  function statusBadge(status) {
    var map = {
      'Disetujui': 'ok', 'Aktif': 'ok', 'Diterima': 'ok',
      'Menunggu': 'wait',
      'Ditolak': 'no',
      'Diambil': 'taken'
    };
    var label = status === 'Diterima' ? 'Terhubung' : status;
    return '<span class="status status--' + (map[status] || 'none') + '"><span class="status-dot" aria-hidden="true"></span>' +
      escapeHtml(label) + '</span>';
  }

  function tags(list) {
    return '<ul class="tags" aria-label="Kategori">' + (list || []).map(function (k) {
      return '<li class="tag">' + escapeHtml(k) + '</li>';
    }).join('') + '</ul>';
  }

  function loading(target, text) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el) {
      el.innerHTML = '<div class="d-flex align-items-center gap-2 py-4 muted" role="status">' +
        '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>' +
        '<span>' + escapeHtml(text || 'Memuat...') + '</span></div>';
    }
  }

  /** Keadaan kosong: catatan kosong yang mengajak bertindak. */
  function emptyState(title, text, actionHtml) {
    return '<div class="note empty">' +
      '<h2 class="note-text">' + escapeHtml(title) + '</h2>' +
      '<p>' + escapeHtml(text) + '</p>' +
      (actionHtml ? '<div class="empty-action">' + actionHtml + '</div>' : '') + '</div>';
  }

  function fillSelect(select, items, placeholder) {
    var html = placeholder ? '<option value="">' + escapeHtml(placeholder) + '</option>' : '';
    items.forEach(function (item) {
      html += '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>';
    });
    select.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Inisialisasi halaman
  // ---------------------------------------------------------------------------

  function init(callback) {
    var body = document.body;
    var page = body.getAttribute('data-page') || '';
    var access = body.getAttribute('data-access') || 'public';

    Api.me()
      .then(function (user) {
        var target = guard(access, page, user);
        if (target) {
          go(target);
          return;
        }
        renderNav(user, page);
        body.classList.add('app-ready');
        consumeFlash();
        if (user && user.role === 'mahasiswa' && user.status === 'Disetujui') refreshBadge();
        if (typeof callback === 'function') callback(user);
      }, function (err) {
        renderNav(null, page);
        body.classList.add('app-ready');
        var main = document.getElementById('main');
        if (main) showError(main, 'Aplikasi gagal dimuat: ' + err.message + '. Muat ulang halaman.');
      });
  }

  global.App = {
    init: init,
    guard: guard,
    homeFor: homeFor,
    escape: escapeHtml,
    param: param,
    formatDate: formatDate,
    timeAgo: timeAgo,
    toast: toast,
    flash: flash,
    showError: showError,
    clearError: clearError,
    fieldError: fieldError,
    clearFieldErrors: clearFieldErrors,
    focusFirstInvalid: focusFirstInvalid,
    busy: busy,
    isEmail: isEmail,
    statusBadge: statusBadge,
    loading: loading,
    emptyState: emptyState,
    fillSelect: fillSelect,
    refreshBadge: refreshBadge,
    // Komponen tampilan & gerak
    hash: hash,
    icon: icon,
    avatar: avatar,
    tags: tags,
    noteStyle: noteStyle,
    noteHTML: noteHTML,
    stampHTML: stampHTML,
    pinBoard: pinBoard,
    stampIn: stampIn,
    drawPath: drawPath,
    reducedMotion: reducedMotion
  };
})(typeof window !== 'undefined' ? window : globalThis);
