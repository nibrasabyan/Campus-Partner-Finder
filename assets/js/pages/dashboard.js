// 3.2 Dashboard: papan kampanye. Catatan ditempel satu per satu saat halaman dibuka.
App.init(function (user) {
  document.getElementById('greet-name').textContent = user.label;
  document.getElementById('pin-btn').innerHTML = App.icon('plus') + 'Pasang kampanye';
  document.getElementById('search-btn').innerHTML = App.icon('search') + 'Cari partner';

  var list = document.getElementById('campaign-list');
  var campaigns = [];
  var firstRender = true;

  function render() {
    var filter = document.querySelector('input[name="camp-filter"]:checked').value;
    var shown = campaigns.filter(function (c) {
      if (filter === 'active') return c.status === 'Aktif';
      if (filter === 'mine') return c.isOwner;
      return true;
    });
    if (!shown.length) {
      list.innerHTML = App.emptyState(
        filter === 'mine' ? 'Anda belum memasang kampanye.' : 'Belum ada kampanye.',
        filter === 'mine' ? 'Tulis kebutuhan Anda, lalu tempel di papan.' : 'Pasang yang pertama untuk memulai.',
        '<a class="btn btn-primary" href="campaign-new.html">Pasang kampanye</a>');
      return;
    }
    list.innerHTML = shown.map(function (c, i) {
      return App.noteHTML(c, { i: i, link: true });
    }).join('');
    // Animasi tempel hanya saat papan pertama kali dibuka, bukan saat ganti tab.
    if (firstRender) App.pinBoard(list);
    firstRender = false;
  }

  Array.prototype.forEach.call(document.querySelectorAll('input[name="camp-filter"]'), function (r) {
    r.addEventListener('change', render);
  });

  App.loading(list, 'Memuat papan...');
  Api.listCampaigns().then(function (data) {
    campaigns = data;
    render();
  }).catch(function (err) {
    list.innerHTML = '';
    App.showError('campaign-alert', err.message);
  });
});
