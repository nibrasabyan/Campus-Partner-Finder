// 5.4 Profil Partner: kartu profil besar dengan tombol Connect di bawahnya
App.init(function () {
  var id = App.param('id');
  var content = document.getElementById('partner-content');

  // Kembali ke hasil pencarian sebelumnya jika datang dari sana.
  try {
    var ref = new URL(document.referrer);
    if (ref.origin === window.location.origin && /\/search\.html$/.test(ref.pathname)) {
      document.getElementById('back-search').setAttribute('href', 'search.html' + ref.search);
    }
  } catch (e) { /* tanpa referrer: pakai tautan bawaan */ }

  function action(p) {
    if (p.isMe) {
      return '<p class="muted mb-3">Ini profil Anda sendiri.</p>' +
        '<a class="btn btn-outline-primary w-100" href="profile.html">Ubah profil</a>';
    }
    if (p.diambil) {
      return '<button type="button" class="btn btn-taken w-100" disabled>' + App.icon('check') + 'Sudah Diambil</button>' +
        '<p class="small-text muted mt-2">Mahasiswa ini sudah Deal dengan partner lain.</p>';
    }
    var k = p.myConnection;
    if (k && k.status === 'Diterima' && k.conversationId) {
      return '<p class="d-flex align-items-center gap-2 fw-bold mb-3"><span class="check-mark">' + App.icon('check') + '</span>Terhubung</p>' +
        '<a class="btn btn-primary w-100" href="chat.html?id=' + encodeURIComponent(k.conversationId) + '">Buka obrolan</a>';
    }
    if (k && k.status === 'Menunggu') {
      return '<button type="button" class="btn btn-outline-primary w-100" disabled>Menunggu jawaban</button>' +
        '<p class="small-text muted mt-2">Obrolan terbuka setelah pemilik profil menerima Connect Anda.</p>';
    }
    return '<button type="button" class="btn btn-primary btn-lg w-100" id="connect-btn">' + App.icon('link') + 'Connect</button>' +
      '<p class="small-text muted mt-2">Pemilik profil mendapat notifikasi dan bisa menerima atau menolak.</p>';
  }

  function render(p) {
    content.innerHTML =
      '<article class="idcard idcard--lg' + (p.diambil ? ' is-taken' : '') + '" aria-labelledby="partner-name">' +
      (p.diambil ? App.stampHTML(false) : '') +
      '<div class="idcard-head">' + App.avatar(p.label, 84) +
      '<div><h1 class="idcard-name" id="partner-name">' + App.escape(p.label) + '</h1>' +
      '<p class="muted">' + App.escape(p.gender) + ', angkatan ' + App.escape(p.angkatan) + '</p></div></div>' +
      '<p class="idcard-bio text-break-anywhere">' + App.escape(p.deskripsi) + '</p>' +
      '<dl class="facts mb-4">' +
      '<div><dt>Fakultas</dt><dd>' + App.escape(p.fakultas) + '</dd></div>' +
      '<div><dt>Program studi</dt><dd>' + App.escape(p.prodi) + '</dd></div>' +
      '<div><dt>Bersedia untuk</dt><dd>' + App.tags(p.kategori) + '</dd></div>' +
      '</dl></article>' +
      '<div class="mt-4" id="partner-action">' + action(p) + '</div>';

    var btn = document.getElementById('connect-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        App.busy(btn, true, 'Mengirim...');
        Api.connect({ type: 'profile', refId: p.userId })
          .then(function () {
            App.toast('Connect terkirim ke ' + p.label + '.');
            load();
          })
          .catch(function (err) {
            App.busy(btn, false);
            App.showError('partner-alert', err.message);
          });
      });
    }
  }

  function load() {
    Api.getPartner(id).then(render).catch(function (err) {
      content.innerHTML = App.emptyState('Profil tidak ditemukan.', err.message,
        '<a class="btn btn-primary" href="search.html">Cari partner lain</a>');
    });
  }

  if (!id) {
    content.innerHTML = App.emptyState('Profil tidak ditemukan.', 'Tautannya tidak lengkap. Pilih profil dari hasil pencarian.',
      '<a class="btn btn-primary" href="search.html">Cari partner</a>');
    return;
  }
  App.loading(content, 'Memuat profil...');
  load();
});
