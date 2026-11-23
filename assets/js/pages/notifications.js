// 8.2 Notifikasi Connect: linimasa dengan titik status.
// Kuning = menunggu jawaban, hijau = terhubung, merah = ditolak, tinta = kabar belum dibaca.
App.init(function () {
  var requestList = document.getElementById('request-list');
  var notifList = document.getElementById('notif-list');

  var STATE = { 'Menunggu': 'wait', 'Diterima': 'ok', 'Ditolak': 'no' };

  function target(r) {
    if (r.type !== 'campaign') return 'profil Anda';
    // Potong judul panjang di batas kata agar tidak berakhir di tengah kata.
    var title = r.title.replace(/^Kampanye: /, '');
    if (title.length > 72) title = title.slice(0, 72).replace(/\s+\S*$/, '') + '…';
    return 'kampanye Anda: <a href="campaign.html?id=' + encodeURIComponent(r.refId) + '">' + App.escape(title) + '</a>';
  }

  function requestItem(r) {
    var p = r.fromProfile || {};
    var actions;
    if (r.status === 'Menunggu') {
      actions =
        '<button type="button" class="btn btn-primary btn-sm" data-respond="' + App.escape(r.id) + '" data-accept="1" aria-label="Terima permintaan dari ' + App.escape(r.fromLabel) + '">Terima</button>' +
        '<button type="button" class="btn btn-outline-danger btn-sm" data-respond="' + App.escape(r.id) + '" data-accept="0" aria-label="Tolak permintaan dari ' + App.escape(r.fromLabel) + '">Tolak</button>';
    } else if (r.status === 'Diterima' && r.conversationId) {
      actions = '<span class="d-inline-flex align-items-center gap-1 fw-bold"><span class="check-mark">' + App.icon('check') + '</span>Terhubung</span>' +
        '<a class="btn btn-outline-primary btn-sm" href="chat.html?id=' + encodeURIComponent(r.conversationId) + '">Buka obrolan</a>';
    } else {
      actions = App.statusBadge(r.status);
    }
    return '<li class="tl-item tl-item--' + (STATE[r.status] || 'none') + '">' +
      '<span class="tl-dot" aria-hidden="true"></span>' +
      '<div class="d-flex flex-column flex-md-row gap-2 gap-md-4 justify-content-between">' +
      '<div class="tl-body">' +
      '<p><a class="fw-bold" href="partner.html?id=' + encodeURIComponent(p.userId || '') + '">' + App.escape(r.fromLabel) + '</a>' +
      ' mengirim Connect untuk ' + target(r) + '</p>' +
      '<p class="tl-time">' + App.escape([p.fakultas, App.timeAgo(r.createdAt)].filter(Boolean).join(', ')) + '</p></div>' +
      '<div class="tl-actions d-flex flex-wrap gap-2 align-items-start flex-shrink-0">' + actions + '</div>' +
      '</div></li>';
  }

  function loadRequests() {
    return Api.listIncomingConnections().then(function (items) {
      var pending = items.filter(function (r) { return r.status === 'Menunggu'; }).length;
      document.getElementById('req-count').textContent = pending ? pending + ' menunggu jawaban' : '';
      if (!items.length) {
        requestList.innerHTML = App.emptyState('Belum ada permintaan Connect.',
          'Pasang kampanye agar mahasiswa lain bisa menghubungi Anda.',
          '<a class="btn btn-primary" href="campaign-new.html">Pasang kampanye</a>');
        return;
      }
      requestList.innerHTML = '<ol class="timeline">' + items.map(requestItem).join('') + '</ol>';
      bindResponses();
    });
  }

  function bindResponses() {
    Array.prototype.forEach.call(requestList.querySelectorAll('[data-respond]'), function (btn) {
      btn.addEventListener('click', function () {
        var accept = btn.getAttribute('data-accept') === '1';
        var item = btn.closest('.tl-item');
        App.busy(btn, true, accept ? 'Menerima...' : 'Menolak...');
        Api.respondConnection(btn.getAttribute('data-respond'), accept)
          .then(function (res) {
            if (accept && res.conversationId) {
              // Titik berubah hijau, tanda centang muncul, lalu obrolan dibuka.
              item.classList.remove('tl-item--wait');
              item.classList.add('tl-item--ok');
              item.querySelector('.tl-actions').innerHTML =
                '<span class="d-inline-flex align-items-center gap-1 fw-bold"><span class="check-mark is-popping">' +
                App.icon('check') + '</span>Terhubung</span><span class="small-text muted">Membuka obrolan...</span>';
              App.flash('Connect diterima. Obrolan terbuka.');
              setTimeout(function () {
                window.location.href = 'chat.html?id=' + encodeURIComponent(res.conversationId);
              }, App.reducedMotion() ? 0 : 800);
            } else {
              App.toast('Permintaan ditolak.', 'info');
              loadRequests();
            }
          })
          .catch(function (err) {
            App.busy(btn, false);
            App.showError('notif-alert', err.message);
            loadRequests();
          });
      });
    });
  }

  function loadNotifications() {
    return Api.listNotifications().then(function (items) {
      if (!items.length) {
        notifList.innerHTML = '<p class="muted">Belum ada kabar. Kabar tentang Connect, Deal, dan verifikasi muncul di sini.</p>';
        return;
      }
      notifList.innerHTML = '<ol class="timeline">' + items.map(function (n) {
        var text = App.escape(n.text);
        var body = n.link && n.link !== 'notifications.html'
          ? '<a href="' + App.escape(n.link) + '">' + text + '</a>'
          : text;
        return '<li class="tl-item' + (n.read ? '' : ' tl-item--unread') + '">' +
          '<span class="tl-dot" aria-hidden="true"></span>' +
          '<div class="tl-body"><p' + (n.read ? '' : ' class="fw-bold"') + '>' +
          (n.read ? '' : '<span class="visually-hidden">Belum dibaca: </span>') + body + '</p>' +
          '<p class="tl-time">' + App.escape(App.timeAgo(n.createdAt)) + '</p></div></li>';
      }).join('') + '</ol>';
      // Tandai semua sudah dibaca setelah ditampilkan.
      if (items.some(function (n) { return !n.read; })) {
        return Api.markAllRead().then(App.refreshBadge);
      }
    });
  }

  App.loading(requestList, 'Memuat permintaan...');
  App.loading(notifList, 'Memuat kabar...');
  loadRequests().catch(function (err) {
    requestList.innerHTML = '';
    App.showError('notif-alert', err.message);
  });
  loadNotifications().catch(function (err) {
    notifList.innerHTML = '';
    App.showError('notif-alert', err.message);
  });
});
