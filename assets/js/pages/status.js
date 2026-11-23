// 3.4 Status Verifikasi: satu kartu besar dengan ilustrasi SVG per status
App.init(function () {
  var content = document.getElementById('status-content');

  // Ilustrasi: kartu KTM sederhana + tanda status di pojok kanan bawah.
  var CARD =
    '<rect x="18" y="40" width="112" height="74" rx="8" fill="#fff" stroke="#1C1B2E" stroke-width="1.5"/>' +
    '<rect x="30" y="54" width="28" height="34" rx="3" fill="#ECEBF3" stroke="#1C1B2E" stroke-width="1.5"/>' +
    '<path d="M68 60h48M68 72h38M68 84h44M30 100h86" stroke="#1C1B2E" stroke-width="1.5" stroke-linecap="round"/>';
  var MARKS = {
    'Belum Lengkap':
      '<path d="M112 140l34-34 10 10-34 34h-10z" fill="#FFD23F" stroke="#1C1B2E" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M140 112l10 10" stroke="#1C1B2E" stroke-width="1.5"/>',
    'Menunggu':
      '<circle cx="128" cy="124" r="24" fill="#FFD23F" stroke="#1C1B2E" stroke-width="1.5"/>' +
      '<path d="M128 110v15l9 6" stroke="#1C1B2E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    'Disetujui':
      '<circle cx="128" cy="124" r="24" fill="#0F8F7A" stroke="#1C1B2E" stroke-width="1.5"/>' +
      '<path d="m117 124 7.5 7.5L140 116" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    'Ditolak':
      '<rect x="104" y="102" width="48" height="44" rx="5" fill="#fff" stroke="#E5412D" stroke-width="3" transform="rotate(-8 128 124)"/>' +
      '<path d="m119 115 18 18M137 115l-18 18" stroke="#E5412D" stroke-width="3" stroke-linecap="round" transform="rotate(-8 128 124)"/>'
  };

  var VIEWS = {
    'Belum Lengkap': {
      title: 'Profil belum lengkap',
      text: 'Isi profil anonim dan unggah foto KTM. Setelah itu admin bisa memverifikasi akun Anda.',
      action: '<a class="btn btn-primary" href="profile.html">Lengkapi profil</a>'
    },
    'Menunggu': {
      title: 'Admin sedang memeriksa KTM Anda',
      text: 'Papan kampanye dan Cari partner terbuka setelah KTM disetujui. Halaman ini bisa Anda periksa lagi kapan saja.',
      action: '<button type="button" class="btn btn-outline-primary" id="refresh-btn">Periksa lagi</button>'
    },
    'Disetujui': {
      title: 'Akun Anda sudah terverifikasi',
      text: 'Anda tercatat sebagai mahasiswa UB. Semua fitur sudah terbuka.',
      action: '<a class="btn btn-primary" href="dashboard.html">Buka papan kampanye</a>'
    },
    'Ditolak': {
      title: 'Foto KTM ditolak',
      text: 'Foto belum bisa diverifikasi. Pastikan foto jelas, tidak terpotong, dan KTM masih berlaku, lalu unggah ulang.',
      action: '<a class="btn btn-danger" href="profile.html#ktm">Unggah ulang KTM</a>'
    }
  };

  function render() {
    App.loading(content, 'Memuat status...');
    Api.getMyProfile().then(function (data) {
      var status = data.account.status;
      // Jika status berubah (misal baru disetujui), muat ulang agar navigasi ikut berubah.
      if (render.lastStatus && render.lastStatus !== status) {
        window.location.reload();
        return;
      }
      render.lastStatus = status;
      var v = VIEWS[status] || VIEWS['Belum Lengkap'];
      var steps = ['Daftar akun', 'Isi profil dan unggah KTM', 'Diperiksa admin', 'Semua fitur terbuka'];
      var reached = { 'Belum Lengkap': 1, 'Menunggu': 2, 'Ditolak': 2, 'Disetujui': 4 }[status] || 1;

      content.innerHTML =
        '<section class="status-card mb-4" aria-labelledby="status-title">' +
        '<svg class="status-art" viewBox="0 0 170 170" role="img" aria-label="Ilustrasi status: ' + App.escape(status) + '">' +
        CARD + (MARKS[status] || MARKS['Belum Lengkap']) + '</svg>' +
        '<div>' + App.statusBadge(status) +
        '<h2 id="status-title">' + App.escape(v.title) + '</h2>' +
        '<p class="measure mb-4">' + App.escape(v.text) + '</p>' + v.action + '</div>' +
        '</section>' +

        '<div class="row g-4">' +
        '<div class="col-12 col-md-6">' +
        '<h2 class="section-title mb-3">Tahapan</h2>' +
        '<ol class="status-steps">' + steps.map(function (s, i) {
          var done = i < reached;
          return '<li class="' + (done ? '' : 'todo') + '">' + App.icon(done ? 'check' : 'clock') +
            '<span>' + App.escape(s) + '<span class="visually-hidden">' + (done ? ', selesai' : ', belum') + '</span></span></li>';
        }).join('') + '</ol></div>' +
        '<div class="col-12 col-md-6">' +
        '<h2 class="section-title mb-3">Data pengajuan</h2>' +
        '<dl class="facts">' +
        '<div><dt>Nama anonim</dt><dd>' + App.escape(data.account.label) + '</dd></div>' +
        '<div><dt>Berkas KTM</dt><dd>' + App.escape(data.ktmFilename || 'Belum ada') + '</dd></div>' +
        '<div><dt>Dikirim</dt><dd>' + App.escape(App.formatDate(data.submittedAt)) + '</dd></div>' +
        '</dl></div></div>';

      var refresh = document.getElementById('refresh-btn');
      if (refresh) refresh.addEventListener('click', render);
    }).catch(function (err) {
      content.innerHTML = '';
      App.showError('status-alert', err.message);
    });
  }

  render();
});
