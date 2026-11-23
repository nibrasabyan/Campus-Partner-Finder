// 1.1 Beranda: catatan contoh ditempel satu per satu di papan
App.init(function (user) {
  var SAMPLES = [
    {
      id: 'contoh-1', ownerLabel: 'Anonim #C3D4', ownerFakultas: 'Fakultas Ilmu Komputer',
      deskripsi: 'Cari narasumber yang fokus di data dan AI untuk wawancara tugas IMK, sekitar 30 menit.',
      benefit: 'Uang tunai Rp50.000', status: 'Aktif'
    },
    {
      id: 'contoh-2', ownerLabel: 'Anonim #A1B2', ownerFakultas: 'Fakultas Ilmu Sosial dan Ilmu Politik',
      deskripsi: 'Teman belajar Kalkulus 2 tiap Kamis sore.',
      benefit: 'Gantian traktir kopi', status: 'Aktif'
    },
    {
      id: 'contoh-3', ownerLabel: 'Anonim #E5F6', ownerFakultas: 'Fakultas Ekonomi dan Bisnis',
      deskripsi: 'Satu anggota tim lomba business plan nasional.',
      benefit: 'Hadiah dibagi rata', status: 'Diambil'
    },
    {
      id: 'contoh-4', ownerLabel: 'Anonim #K9P2', ownerFakultas: 'Fakultas Ilmu Budaya',
      deskripsi: 'Partner project video dokumenter pendek tentang pasar tradisional Malang.',
      benefit: 'Nama di kredit film', status: 'Aktif'
    }
  ];

  var board = document.getElementById('hero-board');
  board.innerHTML = SAMPLES.map(function (c, i) {
    return App.noteHTML(c, { i: i, headingTag: 'p' });
  }).join('');
  App.pinBoard(board);

  if (!user) return;
  // Pengguna yang sudah masuk diberi jalan pintas ke halaman utamanya.
  document.getElementById('hero-actions').innerHTML =
    '<a class="btn btn-primary btn-lg" href="' + App.homeFor(user) + '">Buka aplikasi</a>';
});
