// 3.3 Profil Anonim (+ unggah KTM)
App.init(function (user) {
  var form = document.getElementById('profile-form');
  var deskripsi = document.getElementById('deskripsi');
  var fakultas = document.getElementById('fakultas');
  var prodi = document.getElementById('prodi');
  var angkatan = document.getElementById('angkatan');
  var ktmInput = document.getElementById('ktm-file');
  var preview = document.getElementById('ktm-preview');
  var submitBtn = document.getElementById('submit-btn');
  var existingKtm = null;
  var previewUrl = null;
  var approved = user.status === 'Disetujui';

  // ----- Isi pilihan (satu sumber: Api.FAKULTAS / Api.KATEGORI / Api.GENDER) -----
  App.fillSelect(fakultas, Api.FAKULTAS, 'Pilih fakultas');
  var years = [];
  for (var y = new Date().getFullYear(); y >= 2016; y--) years.push(String(y));
  App.fillSelect(angkatan, years, 'Pilih angkatan');

  document.getElementById('gender-group').innerHTML = Api.GENDER.map(function (g, i) {
    return '<div class="form-check form-check-inline">' +
      '<input class="form-check-input" type="radio" name="gender" id="gender-' + i + '" value="' + App.escape(g) + '">' +
      '<label class="form-check-label" for="gender-' + i + '">' + App.escape(g) + '</label></div>';
  }).join('');

  // Kategori multi-pilih: checkbox asli yang tampil sebagai tag kuning.
  document.getElementById('kategori-group').innerHTML = Api.KATEGORI.map(function (k, i) {
    return '<input class="btn-check" type="checkbox" name="kategori" id="kat-' + i + '" value="' + App.escape(k) + '" autocomplete="off">' +
      '<label class="tag-toggle" for="kat-' + i + '">' + App.icon('check') + App.escape(k) + '</label>';
  }).join('');

  document.getElementById('profile-identity').innerHTML =
    App.avatar(user.label, 56) +
    '<div><p class="fw-bold mb-1">' + App.escape(user.label) + '</p>' + App.statusBadge(user.status) + '</div>';

  // Pesan pembuka sesuai status
  var intro = document.getElementById('profile-intro');
  if (user.status === 'Belum Lengkap') {
    intro.innerHTML = '<div class="alert alert-info">' + App.icon('info') +
      '<div>Satu langkah lagi. Lengkapi profil dan unggah foto KTM, lalu tekan Kirim untuk verifikasi.</div></div>';
  } else if (user.status === 'Ditolak') {
    intro.innerHTML = '<div class="alert alert-danger">' + App.icon('alert') +
      '<div>Foto KTM sebelumnya ditolak. Unggah foto baru yang jelas dan terbaca, lalu tekan Kirim untuk verifikasi.</div></div>';
  } else if (user.status === 'Menunggu') {
    intro.innerHTML = '<div class="alert alert-warning">' + App.icon('clock') +
      '<div>Admin sedang memeriksa KTM Anda. Anda tetap bisa memperbaiki isian di bawah.</div></div>';
  }
  if (approved) {
    submitBtn.textContent = 'Simpan perubahan';
    document.getElementById('ktm-hint').textContent = 'KTM Anda sudah terverifikasi. Mengganti foto tidak wajib.';
  }

  deskripsi.addEventListener('input', function () {
    document.getElementById('deskripsi-count').textContent = deskripsi.value.length;
  });

  function showKtmLabel(title, caption) {
    var old = preview.querySelector('.ktm-preview-img');
    if (old) old.remove();
    preview.querySelector('.ktm-label').hidden = false;
    preview.querySelector('.ktm-label strong').textContent = title;
    document.getElementById('ktm-caption').textContent = caption;
  }

  ktmInput.addEventListener('change', function () {
    ktmInput.classList.remove('is-invalid');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    var file = ktmInput.files[0];
    if (!file) {
      if (existingKtm) showKtmLabel('Berkas tersimpan', existingKtm);
      else showKtmLabel('Belum ada gambar', 'Pilih foto untuk melihat pratinjaunya.');
      return;
    }
    previewUrl = URL.createObjectURL(file);
    var img = document.createElement('img');
    img.className = 'ktm-preview-img';
    img.alt = 'Pratinjau foto KTM yang dipilih';
    img.src = previewUrl;
    preview.querySelector('.ktm-label').hidden = true;
    preview.appendChild(img);
  });

  // ----- Muat data yang sudah ada -----
  Api.getMyProfile().then(function (data) {
    existingKtm = data.ktmFilename;
    if (existingKtm) showKtmLabel('Berkas tersimpan', existingKtm);
    var p = data.profile;
    if (!p) return;
    deskripsi.value = p.deskripsi;
    document.getElementById('deskripsi-count').textContent = p.deskripsi.length;
    fakultas.value = p.fakultas;
    prodi.value = p.prodi;
    angkatan.value = p.angkatan;
    Array.prototype.forEach.call(form.querySelectorAll('input[name="gender"]'), function (r) {
      r.checked = r.value === p.gender;
    });
    Array.prototype.forEach.call(form.querySelectorAll('input[name="kategori"]'), function (c) {
      c.checked = (p.kategori || []).indexOf(c.value) !== -1;
    });
  }).catch(function (err) {
    App.showError('profile-alert', err.message);
  });

  // Jika datang dari tombol "Unggah ulang KTM", fokus ke input KTM.
  if (window.location.hash === '#ktm') ktmInput.focus();

  function groupError(id, message) {
    var el = document.getElementById(id);
    el.textContent = message || '';
    el.classList.toggle('d-block', !!message);
  }

  // ----- Kirim -----
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    App.clearError('profile-alert');
    App.clearFieldErrors(form);

    var gender = form.querySelector('input[name="gender"]:checked');
    var kategori = Array.prototype.map.call(form.querySelectorAll('input[name="kategori"]:checked'), function (c) {
      return c.value;
    });
    var file = ktmInput.files[0];
    var valid = true;

    var d = deskripsi.value.trim();
    if (d.length < 10) {
      App.fieldError(deskripsi, d ? 'Deskripsi minimal 10 karakter. Tambahkan minat atau keahlian Anda.' : 'Tulis deskripsi singkat tentang diri Anda.');
      valid = false;
    }
    if (!fakultas.value) { App.fieldError(fakultas, 'Pilih fakultas Anda.'); valid = false; }
    if (!prodi.value.trim()) { App.fieldError(prodi, 'Tulis program studi Anda.'); valid = false; }
    if (!angkatan.value) { App.fieldError(angkatan, 'Pilih tahun angkatan Anda.'); valid = false; }
    groupError('gender-error', gender ? '' : 'Pilih Laki-laki atau Perempuan.');
    if (!gender) valid = false;
    groupError('kategori-error', kategori.length ? '' : 'Pilih minimal satu kategori partner.');
    if (!kategori.length) valid = false;

    // KTM wajib jika belum pernah diunggah atau verifikasi ditolak.
    var needKtm = !existingKtm || user.status === 'Ditolak';
    if (file) {
      if (['image/jpeg', 'image/png'].indexOf(file.type) === -1) {
        App.fieldError(ktmInput, 'Format foto harus JPG atau PNG. Pilih berkas lain.');
        valid = false;
      } else if (file.size > 2 * 1024 * 1024) {
        App.fieldError(ktmInput, 'Ukuran foto lebih dari 2 MB. Perkecil fotonya, lalu pilih lagi.');
        valid = false;
      }
    } else if (needKtm) {
      App.fieldError(ktmInput, user.status === 'Ditolak' ? 'Pilih foto KTM yang baru.' : 'Pilih foto KTM agar admin bisa memverifikasi akun.');
      valid = false;
    }

    if (!valid) {
      App.showError('profile-alert', 'Beberapa isian belum benar. Perbaiki bagian yang ditandai merah.');
      var first = form.querySelector('.is-invalid');
      if (first) first.focus();
      return;
    }

    App.busy(submitBtn, true, approved ? 'Menyimpan...' : 'Mengirim...');
    Api.submitProfile({
      deskripsi: d,
      fakultas: fakultas.value,
      prodi: prodi.value.trim(),
      angkatan: angkatan.value,
      gender: gender.value,
      kategori: kategori
    }, file ? file.name : null)
      .then(function (account) {
        if (account.status === 'Disetujui') {
          App.busy(submitBtn, false);
          App.toast('Perubahan tersimpan.');
          existingKtm = file ? file.name : existingKtm;
        } else {
          App.flash('Profil terkirim. Admin akan memeriksa KTM Anda.');
          window.location.href = 'status.html';
        }
      })
      .catch(function (err) {
        App.busy(submitBtn, false);
        App.showError('profile-alert', err.message);
      });
  });
});
