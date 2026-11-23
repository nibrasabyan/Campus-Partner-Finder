// 7.3 Antrean KTM: daftar dengan pemisah tipis, setiap baris menuju Detail verifikasi
App.init(function () {
  var content = document.getElementById('queue-content');

  function load() {
    App.clearError('queue-alert');
    App.loading(content, 'Memuat antrean...');
    Api.adminQueue().then(function (items) {
      document.getElementById('queue-summary').textContent = items.length
        ? items.length + ' mahasiswa menunggu verifikasi, dari yang paling lama.'
        : 'Semua pengajuan sudah diperiksa.';
      if (!items.length) {
        content.innerHTML = '<div class="panel"><p class="fw-bold mb-1">Antrean kosong.</p>' +
          '<p class="muted">Pengajuan KTM baru akan muncul di sini.</p></div>';
        return;
      }
      content.innerHTML = '<ol class="rows panel panel--flush">' + items.map(function (u) {
        var facts = [u.fakultas, u.prodi, u.angkatan ? 'angkatan ' + u.angkatan : ''].filter(Boolean).join(', ');
        return '<li><a class="row-item" href="admin-review.html?id=' + encodeURIComponent(u.id) + '">' +
          App.avatar(u.label, 44) +
          '<div class="row-main">' +
          '<p class="row-title">' + App.escape(u.label) + '</p>' +
          '<p class="row-sub text-break-anywhere">' + App.escape(u.email) + '</p>' +
          '<p class="row-sub d-none d-md-block">' + App.escape(facts) + '</p></div>' +
          '<div class="text-end flex-shrink-0">' +
          '<p class="small-text muted mb-1">' + App.escape(App.timeAgo(u.submittedAt)) + '</p>' +
          '<span class="fw-bold text-decoration-underline">Periksa</span></div>' +
          '</a></li>';
      }).join('') + '</ol>';
    }).catch(function (err) {
      content.innerHTML = '';
      App.showError('queue-alert', err.message);
    });
  }

  document.getElementById('refresh-btn').addEventListener('click', load);
  load();
});
