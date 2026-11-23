// 7.4 Detail Verifikasi + 7.5 Setujui / Tolak
App.init(function () {
  var id = App.param('id');
  var content = document.getElementById('review-content');

  function backToQueue(message) {
    content.innerHTML = '<div class="panel"><p class="fw-bold mb-1">Data tidak ditemukan.</p>' +
      '<p class="muted mb-3">' + App.escape(message) + '</p>' +
      '<a class="btn btn-primary" href="admin-queue.html">Buka antrean</a></div>';
  }

  if (!id) {
    backToQueue('Tautannya tidak lengkap. Pilih pengguna dari antrean.');
    return;
  }

  function render(u) {
    var p = u.profile || {};
    var pending = u.status === 'Menunggu';
    content.innerHTML =
      '<div class="d-flex flex-wrap align-items-center gap-3 mb-4">' + App.avatar(u.label, 56) +
      '<div><h1 class="page-title">' + App.escape(u.label) + '</h1>' + App.statusBadge(u.status) + '</div></div>' +

      '<div class="row g-4">' +
      '<section class="col-12 col-lg-6" aria-labelledby="ktm-title">' +
      '<h2 class="section-title mb-3" id="ktm-title">Foto KTM</h2>' +
      // Pratinjau: kertas kartu dengan label yang jelas, bukan pola diagonal.
      '<div class="ktm-card" role="img" aria-label="Belum ada gambar KTM. Berkas: ' + App.escape(u.ktmFilename || 'tidak ada') + '">' +
      '<div class="ktm-photo"></div>' +
      '<div class="ktm-lines"><span></span><span></span><span></span><span></span></div>' +
      '<div class="ktm-label"><strong>Belum ada gambar</strong>' +
      '<span class="small-text muted text-break-anywhere">Berkas: ' + App.escape(u.ktmFilename || 'tidak ada') + '</span></div></div>' +
      '<p class="small-text muted mt-3 measure">Gambar tampil setelah penyimpanan berkas di backend tersambung. Periksa nama Universitas Brawijaya, fakultas, dan masa berlaku.</p>' +
      '</section>' +

      '<section class="col-12 col-lg-6" aria-labelledby="data-title">' +
      '<h2 class="section-title mb-3" id="data-title">Data profil</h2>' +
      '<dl class="facts panel">' +
      '<div><dt>Email</dt><dd>' + App.escape(u.email) + '</dd></div>' +
      '<div><dt>Fakultas</dt><dd>' + App.escape(p.fakultas || '-') + '</dd></div>' +
      '<div><dt>Program studi</dt><dd>' + App.escape(p.prodi || '-') + '</dd></div>' +
      '<div><dt>Angkatan</dt><dd>' + App.escape(p.angkatan || '-') + '</dd></div>' +
      '<div><dt>Gender</dt><dd>' + App.escape(p.gender || '-') + '</dd></div>' +
      '<div><dt>Deskripsi</dt><dd class="fw-normal">' + App.escape(p.deskripsi || '-') + '</dd></div>' +
      '<div><dt>Dikirim</dt><dd>' + App.escape(App.formatDate(u.submittedAt)) + '</dd></div>' +
      '</dl></section></div>' +

      '<div class="mt-4 pt-4 border-top">' +
      (pending
        ? '<p class="muted mb-3">Mahasiswa mendapat notifikasi tentang keputusan Anda.</p>' +
          '<div class="d-flex flex-column flex-sm-row gap-2">' +
          '<button type="button" class="btn btn-primary" data-decision="Disetujui">' + App.icon('check') + 'Setujui</button>' +
          '<button type="button" class="btn btn-outline-danger" data-decision="Ditolak">' + App.icon('x') + 'Tolak</button></div>'
        : '<p>Pengguna ini sudah diperiksa. Statusnya ' + App.statusBadge(u.status) + '.</p>') +
      '</div>';

    Array.prototype.forEach.call(content.querySelectorAll('[data-decision]'), function (btn) {
      btn.addEventListener('click', function () {
        var decision = btn.getAttribute('data-decision');
        Array.prototype.forEach.call(content.querySelectorAll('[data-decision]'), function (b) { b.disabled = true; });
        App.busy(btn, true, 'Menyimpan...');
        Api.adminReview(u.id, decision).then(function () {
          App.flash(u.label + (decision === 'Disetujui' ? ' disetujui.' : ' ditolak.'),
            decision === 'Disetujui' ? 'success' : 'info');
          window.location.href = 'admin-queue.html';
        }).catch(function (err) {
          App.busy(btn, false);
          Array.prototype.forEach.call(content.querySelectorAll('[data-decision]'), function (b) { b.disabled = false; });
          App.showError('review-alert', err.message);
        });
      });
    });
  }

  App.loading(content, 'Memuat data...');
  Api.adminGetUser(id).then(render).catch(function (err) { backToQueue(err.message); });
});
