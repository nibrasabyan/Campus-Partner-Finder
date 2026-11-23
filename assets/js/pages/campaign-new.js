// 4.2 Buat Kampanye: pratinjau memakai komponen catatan yang sama dengan papan,
// sehingga warna, ukuran, dan kemiringannya persis seperti setelah terbit.
App.init(function (user) {
  var form = document.getElementById('campaign-form');
  var deskripsi = document.getElementById('deskripsi');
  var benefit = document.getElementById('benefit');
  var preview = document.getElementById('preview');
  var fakultas = '';

  function updatePreview() {
    document.getElementById('deskripsi-count').textContent = deskripsi.value.trim().length;
    preview.innerHTML = App.noteHTML({
      id: 'pratinjau',
      ownerLabel: user.label,
      ownerFakultas: fakultas,
      deskripsi: deskripsi.value.trim() || 'Deskripsi Anda muncul di sini.',
      benefit: benefit.value.trim() || 'Benefit untuk partner',
      status: 'Aktif',
      isOwner: true
    }, { headingTag: 'p' });
  }
  deskripsi.addEventListener('input', updatePreview);
  benefit.addEventListener('input', updatePreview);
  updatePreview();

  Api.getMyProfile().then(function (data) {
    fakultas = data.profile ? data.profile.fakultas : '';
    updatePreview();
  }).catch(function () { /* pratinjau tetap tampil tanpa fakultas */ });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    App.clearError('campaign-alert');
    App.clearFieldErrors(form);
    var valid = true;
    var d = deskripsi.value.trim();
    if (!d) {
      App.fieldError(deskripsi, 'Tulis apa yang Anda cari.');
      valid = false;
    } else if (d.length < 20) {
      App.fieldError(deskripsi, 'Deskripsi minimal 20 karakter. Tambahkan tujuan dan kriteria partner (sekarang ' + d.length + ').');
      valid = false;
    }
    if (!benefit.value.trim()) {
      App.fieldError(benefit, 'Tulis benefit untuk partner, misalnya uang tunai atau camilan.');
      valid = false;
    }
    if (!valid) {
      App.focusFirstInvalid(form);
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    App.busy(btn, true, 'Menerbitkan...');
    Api.createCampaign({ deskripsi: d, benefit: benefit.value.trim() })
      .then(function (c) {
        App.flash('Kampanye terbit.');
        window.location.href = 'campaign.html?id=' + encodeURIComponent(c.id);
      })
      .catch(function (err) {
        App.busy(btn, false);
        App.showError('campaign-alert', err.message);
      });
  });
});
