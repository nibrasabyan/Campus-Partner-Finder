// 4.3 Detail Kampanye + 4.4 Respons / Connect
// Catatan besar di kiri, kolom respons di kanan. Garis SVG menghubungkan catatan
// dengan setiap respons yang masih berlaku (menunggu atau terhubung).
App.init(function () {
  var id = App.param('id');
  var content = document.getElementById('campaign-content');
  var resizeTimer = null;

  if (!id) {
    content.innerHTML = App.emptyState('Kampanye tidak ditemukan.', 'Tautannya tidak lengkap. Pilih kampanye dari papan.',
      '<a class="btn btn-primary" href="dashboard.html">Buka papan kampanye</a>');
    return;
  }

  // ----- Garis penghubung -----
  function drawConnectors(animate) {
    var svg = content.querySelector('.connector');
    var note = document.getElementById('detail-note');
    if (!svg || !note) return;
    var box = content.getBoundingClientRect();
    var n = note.getBoundingClientRect();
    var side = window.matchMedia('(min-width: 992px)').matches;
    var html = '';
    Array.prototype.forEach.call(content.querySelectorAll('[data-anchor]'), function (t) {
      var r = t.getBoundingClientRect();
      var sx, sy, ex, ey, d;
      if (side) {
        // Dari tepi kanan catatan ke tepi kiri kartu respons, berupa kurva.
        sx = n.right - box.left;
        sy = Math.min(Math.max(r.top + r.height / 2, n.top + 48), n.bottom - 48) - box.top;
        ex = r.left - box.left;
        ey = r.top + r.height / 2 - box.top;
        var mid = (sx + ex) / 2;
        d = 'M' + sx + ' ' + sy + ' C' + mid + ' ' + sy + ' ' + mid + ' ' + ey + ' ' + ex + ' ' + ey;
      } else {
        // Layar sempit: turun dari bawah catatan lewat celah kiri, lalu belok ke kartu.
        sx = r.left - box.left - 14;
        sy = n.bottom - box.top;
        ex = r.left - box.left;
        ey = r.top - box.top + 28;
        d = 'M' + sx + ' ' + sy + ' V' + (ey - 8) + ' Q' + sx + ' ' + ey + ' ' + (sx + 8) + ' ' + ey + ' H' + ex;
      }
      html += '<path d="' + d + '"/><circle cx="' + sx + '" cy="' + sy + '" r="3"/><circle cx="' + ex + '" cy="' + ey + '" r="3"/>';
    });
    svg.innerHTML = html;
    if (animate) {
      Array.prototype.forEach.call(svg.querySelectorAll('path'), function (p) { App.drawPath(p, 400); });
    }
  }

  // ----- Kartu di kolom samping -----
  function responseItem(r, taken) {
    var p = r.fromProfile || {};
    var connected = r.status === 'Diterima';
    var actions;
    if (r.status === 'Menunggu' && !taken) {
      actions =
        '<button type="button" class="btn btn-primary btn-sm" data-respond="' + App.escape(r.id) + '" data-accept="1" aria-label="Terima ' + App.escape(r.fromLabel) + '">Terima</button>' +
        '<button type="button" class="btn btn-outline-danger btn-sm" data-respond="' + App.escape(r.id) + '" data-accept="0" aria-label="Tolak ' + App.escape(r.fromLabel) + '">Tolak</button>';
    } else if (connected && r.conversationId) {
      actions = '<span class="d-inline-flex align-items-center gap-1 fw-bold"><span class="check-mark">' + App.icon('check') + '</span>Terhubung</span>' +
        '<a class="btn btn-outline-primary btn-sm" href="chat.html?id=' + encodeURIComponent(r.conversationId) + '">Buka obrolan</a>';
    } else {
      actions = App.statusBadge(r.status);
    }
    var facts = [p.fakultas, p.angkatan ? 'angkatan ' + p.angkatan : ''].filter(Boolean).join(', ');
    return '<li class="response' + (connected ? ' is-connected' : '') + '"' +
      (r.status !== 'Ditolak' ? ' data-anchor' : '') + '>' +
      '<div class="d-flex gap-3 align-items-start">' + App.avatar(r.fromLabel, 40) +
      '<div class="flex-grow-1" style="min-width:0">' +
      '<a class="fw-bold" href="partner.html?id=' + encodeURIComponent(p.userId || '') + '">' + App.escape(r.fromLabel) + '</a>' +
      '<p class="small-text muted">' + App.escape(facts) + '</p>' +
      '<p class="small-text muted">Mengirim Connect ' + App.escape(App.timeAgo(r.createdAt)) + '</p>' +
      '<div class="response-actions d-flex flex-wrap gap-2 align-items-center mt-2">' + actions + '</div>' +
      '</div></div></li>';
  }

  function visitorItem(c) {
    var k = c.myConnection;
    var body;
    var cls = 'response';
    var anchor = false;
    if (c.status === 'Diambil') {
      body = '<p class="mb-3">Kampanye ini sudah mendapat partner.</p>' +
        '<button type="button" class="btn btn-taken w-100" disabled>' + App.icon('check') + 'Sudah Diambil</button>';
    } else if (k && k.status === 'Diterima' && k.conversationId) {
      cls += ' is-connected';
      anchor = true;
      body = '<p class="d-flex align-items-center gap-2 fw-bold mb-3"><span class="check-mark">' + App.icon('check') + '</span>Terhubung dengan pembuat kampanye</p>' +
        '<a class="btn btn-primary w-100" href="chat.html?id=' + encodeURIComponent(k.conversationId) + '">Buka obrolan</a>';
    } else if (k && k.status === 'Menunggu') {
      anchor = true;
      body = '<p class="mb-1">' + App.statusBadge('Menunggu') + '</p>' +
        '<p class="small-text muted mb-3">Connect terkirim. Jawabannya muncul di Notifikasi.</p>' +
        '<button type="button" class="btn btn-outline-primary w-100" disabled>Menunggu jawaban</button>';
    } else {
      body = '<p class="mb-3">Kirim Connect. Obrolan terbuka setelah pembuat kampanye menerima.</p>' +
        '<button type="button" class="btn btn-primary w-100" id="connect-btn">' + App.icon('link') + 'Connect</button>';
    }
    return '<li class="' + cls + '"' + (anchor ? ' data-anchor' : '') + '>' + body + '</li>';
  }

  function render(c, animate) {
    var taken = c.status === 'Diambil';
    var side;
    if (c.isOwner) {
      var pending = c.requests.filter(function (r) { return r.status === 'Menunggu'; }).length;
      side =
        '<h2 class="section-title mb-1" id="side-title">Respons</h2>' +
        '<p class="small-text muted mb-3">' + (taken ? 'Kampanye sudah diambil.' : pending + ' menunggu jawaban Anda.') + '</p>' +
        (c.requests.length
          ? '<ol class="list-unstyled d-grid gap-3 m-0 ps-4 ps-lg-0">' + c.requests.map(function (r) { return responseItem(r, taken); }).join('') + '</ol>'
          : '<p class="measure muted">Belum ada yang mengirim Connect. Catatan Anda sudah tampil di papan.</p>');
    } else {
      // Celah kiri (untuk garis penghubung di layar sempit) hanya dipakai jika ada garis.
      var linked = !taken && c.myConnection && c.myConnection.status !== 'Ditolak';
      side =
        '<h2 class="section-title mb-3" id="side-title">' + (taken ? 'Sudah diambil' : 'Tertarik?') + '</h2>' +
        '<ol class="list-unstyled m-0' + (linked ? ' ps-4 ps-lg-0' : '') + '">' + visitorItem(c) + '</ol>';
    }

    content.innerHTML =
      '<svg class="connector" aria-hidden="true" focusable="false"></svg>' +
      '<div class="row gy-5 gx-lg-5 align-items-start">' +
      '<div class="col-12 col-lg-7"><div class="pe-lg-4">' +
      App.noteHTML(c, { variant: 'detail', id: 'detail-note' }) +
      '<p class="small-text muted mt-3">Dipasang ' + App.escape(App.formatDate(c.createdAt)) + '.</p>' +
      '</div></div>' +
      '<aside class="col-12 col-lg-5" aria-labelledby="side-title">' + side + '</aside>' +
      '</div>';

    drawConnectors(animate);
    bindActions(c);
  }

  function bindActions(c) {
    var connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', function () {
        App.busy(connectBtn, true, 'Mengirim...');
        Api.connect({ type: 'campaign', refId: c.id })
          .then(function () {
            App.toast('Connect terkirim. Tunggu jawaban di Notifikasi.');
            load(true);
          })
          .catch(function (err) {
            App.busy(connectBtn, false);
            App.showError('campaign-alert', err.message);
          });
      });
    }

    Array.prototype.forEach.call(content.querySelectorAll('[data-respond]'), function (btn) {
      btn.addEventListener('click', function () {
        var accept = btn.getAttribute('data-accept') === '1';
        var item = btn.closest('.response');
        App.busy(btn, true, accept ? 'Menerima...' : 'Menolak...');
        Api.respondConnection(btn.getAttribute('data-respond'), accept)
          .then(function (res) {
            if (accept && res.conversationId) {
              // Kartu berubah menjadi "Terhubung", lalu obrolan dibuka.
              item.classList.add('is-connected');
              item.querySelector('.response-actions').innerHTML =
                '<span class="d-inline-flex align-items-center gap-1 fw-bold"><span class="check-mark is-popping">' +
                App.icon('check') + '</span>Terhubung</span><span class="small-text muted">Membuka obrolan...</span>';
              App.flash('Connect diterima. Obrolan terbuka.');
              setTimeout(function () {
                window.location.href = 'chat.html?id=' + encodeURIComponent(res.conversationId);
              }, App.reducedMotion() ? 0 : 800);
            } else {
              App.toast('Permintaan ditolak.', 'info');
              load(false);
            }
          })
          .catch(function (err) {
            App.busy(btn, false);
            App.showError('campaign-alert', err.message);
          });
      });
    });
  }

  function load(animate) {
    return Api.getCampaign(id).then(function (c) { render(c, animate); }).catch(function (err) {
      content.innerHTML = App.emptyState('Kampanye tidak ditemukan.', err.message,
        '<a class="btn btn-primary" href="dashboard.html">Buka papan kampanye</a>');
    });
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { drawConnectors(false); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawConnectors(false); });

  App.loading(content, 'Memuat kampanye...');
  load(false);
});
