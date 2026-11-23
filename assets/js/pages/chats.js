// 6.1 Room Chat: daftar percakapan, dipisah garis tipis
App.init(function () {
  var list = document.getElementById('chat-list');

  function state(c) {
    if (c.deal) return App.statusBadge('Diambil');
    if (c.closed) return '<span class="status"><span class="status-dot" aria-hidden="true"></span>Ditutup</span>';
    return App.statusBadge('Aktif');
  }

  App.loading(list, 'Memuat obrolan...');
  Api.listConversations().then(function (items) {
    if (!items.length) {
      list.innerHTML = App.emptyState('Belum ada obrolan.',
        'Kirim Connect ke kampanye atau profil. Obrolan terbuka setelah permintaan diterima.',
        '<a class="btn btn-primary" href="dashboard.html">Buka papan kampanye</a>' +
        '<a class="btn btn-outline-primary" href="notifications.html">Lihat notifikasi</a>');
      return;
    }
    list.innerHTML = '<ul class="rows panel panel--flush">' + items.map(function (c) {
      var source = c.type === 'campaign' ? 'Dari kampanye: ' + c.refTitle : 'Dari ' + c.refTitle.charAt(0).toLowerCase() + c.refTitle.slice(1);
      return '<li><a class="row-item" href="chat.html?id=' + encodeURIComponent(c.id) + '">' +
        App.avatar(c.partnerLabel, 44) +
        '<div class="row-main">' +
        '<div class="d-flex justify-content-between gap-2">' +
        '<span class="row-title">' + App.escape(c.partnerLabel) + '</span>' +
        '<span class="small-text muted text-nowrap">' + App.escape(App.timeAgo(c.lastAt)) + '</span></div>' +
        '<p class="row-sub truncate">' + App.escape(source) + '</p>' +
        '<div class="d-flex justify-content-between gap-3 align-items-center mt-1">' +
        '<span class="truncate">' + App.escape(c.lastMessage || 'Belum ada pesan. Sapa duluan.') + '</span>' +
        state(c) + '</div></div></a></li>';
    }).join('') + '</ul>';
  }).catch(function (err) {
    list.innerHTML = '';
    App.showError('chats-alert', err.message);
  });
});
