// 5.2 Filter Pencarian + 5.3 Hasil Pencarian
App.init(function () {
  var form = document.getElementById('filter-form');
  var kategori = document.getElementById('f-kategori');
  var fakultas = document.getElementById('f-fakultas');
  var list = document.getElementById('result-list');
  var count = document.getElementById('result-count');
  var panel = document.getElementById('filter-panel');

  document.getElementById('open-filter').innerHTML = App.icon('filter') + 'Atur filter';

  // ----- Isi pilihan filter (satu sumber: Api.KATEGORI / Api.FAKULTAS / Api.GENDER) -----
  App.fillSelect(kategori, ['Semua'].concat(Api.KATEGORI));
  fakultas.innerHTML = '<option value="Semua">Semua fakultas</option>' +
    Api.FAKULTAS.map(function (f) { return '<option value="' + App.escape(f) + '">' + App.escape(f) + '</option>'; }).join('');
  document.getElementById('f-gender').innerHTML = Api.GENDER.concat(['Random']).map(function (g, i) {
    return '<div class="form-check">' +
      '<input class="form-check-input" type="radio" name="gender" id="g-' + i + '" value="' + App.escape(g) + '"' + (g === 'Random' ? ' checked' : '') + '>' +
      '<label class="form-check-label" for="g-' + i + '">' + App.escape(g === 'Random' ? 'Siapa saja' : g) + '</label></div>';
  }).join('');

  list.innerHTML = '<div class="col-12">' + App.emptyState('Mulai dari filter.',
    'Pilih kategori, fakultas, dan gender partner, lalu tekan Cari.') + '</div>';

  function currentFilter() {
    return {
      kategori: kategori.value,
      fakultas: fakultas.value,
      gender: form.querySelector('input[name="gender"]:checked').value
    };
  }

  // Kartu profil anonim: avatar geometris, fakta singkat, kategori sebagai tag.
  function card(p) {
    var bio = p.deskripsi.length > 140 ? p.deskripsi.slice(0, 140) + '…' : p.deskripsi;
    return '<div class="col-12 col-md-6 col-xxl-4">' +
      '<article class="idcard' + (p.diambil ? ' is-taken' : '') + '">' +
      (p.diambil ? App.stampHTML(true) : '') +
      '<div class="idcard-head">' + App.avatar(p.label, 56) +
      '<div><h3 class="idcard-name"><a class="stretched-link" href="partner.html?id=' + encodeURIComponent(p.userId) + '">' +
      App.escape(p.label) + '</a></h3>' +
      '<p class="small-text muted">' + App.escape(p.gender) + ', angkatan ' + App.escape(p.angkatan) + '</p></div></div>' +
      '<dl class="idcard-facts">' +
      '<div><dt>Fakultas</dt><dd>' + App.escape(p.fakultas) + '</dd></div>' +
      '<div><dt>Prodi</dt><dd>' + App.escape(p.prodi) + '</dd></div></dl>' +
      '<p class="idcard-bio text-break-anywhere">' + App.escape(bio) + '</p>' +
      App.tags(p.kategori) +
      '</article></div>';
  }

  function search(filter) {
    App.clearError('search-alert');
    App.loading(list, 'Mencari profil...');
    count.textContent = '';
    var btn = form.querySelector('button[type="submit"]');
    App.busy(btn, true, 'Mencari...');
    Api.searchProfiles(filter).then(function (results) {
      App.busy(btn, false);
      count.textContent = results.length + ' profil cocok';
      if (!results.length) {
        list.innerHTML = '<div class="col-12">' + App.emptyState('Belum ada profil yang cocok.',
          'Ganti kategori atau fakultas, atau pilih gender Siapa saja.') + '</div>';
        return;
      }
      list.innerHTML = results.map(card).join('');
    }).catch(function (err) {
      App.busy(btn, false);
      list.innerHTML = '';
      App.showError('search-alert', err.message);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = currentFilter();
    // Simpan filter di URL agar hasil tetap ada saat kembali dari halaman profil.
    history.replaceState(null, '', 'search.html?' + new URLSearchParams(f).toString());
    search(f);
    // Di layar sempit, tutup bottom sheet setelah mencari.
    var sheet = bootstrap.Offcanvas.getInstance(panel);
    if (sheet) sheet.hide();
  });

  form.addEventListener('reset', function () {
    setTimeout(function () {
      history.replaceState(null, '', 'search.html');
      count.textContent = '';
    }, 0);
  });

  // Pulihkan filter dari URL (misal setelah menekan tombol Kembali).
  var params = new URLSearchParams(window.location.search);
  if (params.has('kategori')) {
    kategori.value = params.get('kategori');
    fakultas.value = params.get('fakultas') || 'Semua';
    var wanted = params.get('gender') || 'Random';
    Array.prototype.forEach.call(form.querySelectorAll('input[name="gender"]'), function (r) {
      r.checked = r.value === wanted;
    });
    if (!form.querySelector('input[name="gender"]:checked')) {
      form.querySelector('input[name="gender"][value="Random"]').checked = true;
    }
    if (!kategori.value) kategori.value = 'Semua';
    if (!fakultas.value) fakultas.value = 'Semua';
    search(currentFilter());
  }
});
