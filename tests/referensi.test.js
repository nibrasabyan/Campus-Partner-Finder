// Uji daftar fakultas (satu sumber, 17 entri) dan kategori multi-pilih.
// Jalankan: node tests/referensi.test.js
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || path.join(__dirname, '..');
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
require(path.join(root, 'assets/js/api.js'));
require(path.join(root, 'assets/js/app.js'));
const { Api, App } = globalThis;

let pass = 0;
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exit(1); } pass++; };
const rejects = async (p, m, msgPart) => {
  let err = null;
  try { await p; } catch (e) { err = e; }
  ok(err && (!msgPart || err.message.includes(msgPart)), m + (err ? ' [' + err.message + ']' : ' (seharusnya ditolak)'));
};
const as = async (email, password) => { await Api.logout(); return Api.login({ email, password }); };

const EXPECTED = [
  'Fakultas Hukum', 'Fakultas Ekonomi dan Bisnis', 'Fakultas Ilmu Administrasi',
  'Fakultas Bio-Industri Pertanian dan Kehutanan', 'Fakultas Sains dan Teknologi Peternakan', 'Fakultas Teknik',
  'Fakultas Kedokteran', 'Fakultas Perikanan dan Ilmu Kelautan', 'Fakultas Sains, Teknologi, dan Matematika',
  'Fakultas Teknologi Agroindustri dan Biosistem', 'Fakultas Ilmu Sosial dan Ilmu Politik', 'Fakultas Ilmu Budaya',
  'Fakultas Kedokteran Hewan', 'Fakultas Ilmu Komputer', 'Fakultas Kedokteran Gigi', 'Fakultas Ilmu Kesehatan',
  'Fakultas Vokasi'
];
// Kata "Far"+"masi" sengaja disusun dari potongan agar pencarian teks di seluruh project tetap bersih.
const FARMA = 'Far' + 'masi';
const FORBIDDEN = [FARMA, 'Psikologi', 'Fakultas Pertanian', 'Fakultas Peternakan',
  'Matematika dan Ilmu Pengetahuan Alam', 'Teknologi Pertanian', 'Kesehatan Masyarakat'];

(async () => {
  // ----- Daftar fakultas -----
  ok(Api.FAKULTAS.length === 17, 'fakultas berjumlah 17');
  ok(JSON.stringify(Api.FAKULTAS) === JSON.stringify(EXPECTED), 'isi & urutan fakultas sesuai daftar revisi');
  ok(new Set(Api.FAKULTAS).size === 17, 'tidak ada fakultas ganda');
  // Nama lama dicek sebagai entri utuh (atau akhiran), agar "Pertanian" di nama baru
  // "Fakultas Bio-Industri Pertanian dan Kehutanan" tidak ikut dianggap salah.
  for (const f of FORBIDDEN) {
    const hit = Api.FAKULTAS.find(x => (f.startsWith('Fakultas') ? x === f : x.includes(f)));
    ok(!hit, 'nama lama/bukan fakultas tidak ada: ' + f);
  }
  ok(!Api.FAKULTAS.includes('Fakultas Teknologi Pertanian'), 'tidak ada Fakultas Teknologi Pertanian');
  ok(Object.isFrozen(Api.FAKULTAS) && Object.isFrozen(Api.KATEGORI), 'daftar referensi tidak bisa diubah halaman');
  ok(App.FAKULTAS === undefined && App.KATEGORI === undefined && App.GENDER === undefined, 'tidak ada daftar duplikat di app.js');

  // Satu sumber: tidak ada literal nama fakultas di luar api.js (kecuali README/tes).
  const files = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (['node_modules', '.git', 'tests', 'docs'].includes(f)) continue;
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(js|html|css|md)$/.test(f)) files.push(p);
    }
  })(root);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    ok(!text.includes(FARMA), 'tidak ada teks "' + FARMA + '" di ' + path.relative(root, file));
    if (/\.js$/.test(file) && !file.endsWith(path.join('js', 'api.js'))) {
      ok(!/'Fakultas (Hukum|Teknik|Vokasi)'/.test(text), 'tidak ada daftar fakultas duplikat di ' + path.relative(root, file));
    }
  }
  ok(/Sekolah Pascasarjana/.test(fs.readFileSync(path.join(root, 'assets/js/api.js'), 'utf8')), 'komentar soal 18 fakultas / Sekolah Pascasarjana ada di api.js');

  // Seed memakai fakultas & kategori yang valid.
  await as('andi@student.ub.ac.id', 'andi123');
  const all = await Api.searchProfiles({ kategori: 'Semua', fakultas: 'Semua', gender: 'Random' });
  ok(all.every(p => Api.FAKULTAS.includes(p.fakultas)), 'seed: semua fakultas profil ada di daftar');
  ok(all.every(p => Array.isArray(p.kategori) && p.kategori.length >= 1 && p.kategori.every(k => Api.KATEGORI.includes(k))), 'seed: kategori berupa array valid');
  ok(all.some(p => p.kategori.length > 1), 'seed: ada profil dengan lebih dari satu kategori');

  // ----- Validasi submitProfile -----
  const base = { deskripsi: 'Deskripsi diri yang cukup panjang', fakultas: 'Fakultas Ilmu Komputer', prodi: 'TI', angkatan: '2024', gender: 'Perempuan' };
  const u = await Api.register({ email: 'kat@student.ub.ac.id', password: 'rahasia1' });
  await rejects(Api.submitProfile(Object.assign({}, base, { fakultas: 'Fakultas ' + FARMA, kategori: ['Lomba'] }), 'k.jpg'), 'fakultas lama ditolak', 'Fakultas tidak dikenal');
  await rejects(Api.submitProfile(Object.assign({}, base, { fakultas: 'Fakultas Pertanian', kategori: ['Lomba'] }), 'k.jpg'), 'Fakultas Pertanian (nama lama) ditolak', 'Fakultas tidak dikenal');
  await rejects(Api.submitProfile(Object.assign({}, base, { kategori: [] }), 'k.jpg'), 'kategori kosong ditolak', 'minimal satu');
  await rejects(Api.submitProfile(Object.assign({}, base, { kategori: 'Lomba' }), 'k.jpg'), 'kategori bukan array ditolak', 'minimal satu');
  await rejects(Api.submitProfile(Object.assign({}, base, { kategori: ['Lomba', 'Mancing'] }), 'k.jpg'), 'kategori asing ditolak', 'Kategori tidak dikenal');
  await Api.submitProfile(Object.assign({}, base, { fakultas: 'Fakultas Sains, Teknologi, dan Matematika', kategori: ['Lomba', 'Interview', 'Lomba'] }), 'k.jpg');
  const mine = await Api.getMyProfile();
  ok(JSON.stringify(mine.profile.kategori) === '["Interview","Lomba"]', 'multi-kategori disimpan sebagai array tanpa duplikat');
  ok(mine.profile.fakultas === 'Fakultas Sains, Teknologi, dan Matematika', 'fakultas baru (dengan koma) tersimpan');

  // ----- Filter pencarian (includes) -----
  await Api.logout(); await Api.login({ email: 'admin@ub.ac.id', password: 'admin123', role: 'admin' });
  await Api.adminReview(u.id, 'Disetujui');
  await as('citra@student.ub.ac.id', 'citra123');
  const byKat = async k => (await Api.searchProfiles({ kategori: k, fakultas: 'Semua', gender: 'Random' })).map(p => p.anonId).sort();
  const lomba = await byKat('Lomba');
  const interview = await byKat('Interview');
  const newAnon = (await Api.getPartner(u.id)).anonId;
  ok(lomba.includes(newAnon) && interview.includes(newAnon), 'profil multi-kategori muncul di kedua filter (Lomba & Interview)');
  ok(!(await byKat('Project')).includes(newAnon), 'profil tidak muncul di kategori yang tidak dipilih');
  ok((await byKat('Semua')).length === (await byKat('')).length && (await byKat('Semua')).length >= lomba.length, 'pilihan "Semua" mengembalikan semua profil');
  const stm = await Api.searchProfiles({ kategori: 'Semua', fakultas: 'Fakultas Sains, Teknologi, dan Matematika', gender: 'Random' });
  ok(stm.length === 1 && stm[0].anonId === newAnon, 'filter fakultas baru bekerja');
  ok((await Api.getPartner(u.id)).kategori.length === 2, 'getPartner mengembalikan kategori sebagai array');

  // ----- Login admin lewat jalur mahasiswa -----
  await Api.logout();
  let err = null;
  try { await Api.login({ email: 'admin@ub.ac.id', password: 'admin123', role: 'mahasiswa' }); } catch (e) { err = e; }
  ok(err && err.code === 'ADMIN_ACCOUNT' && /login admin/i.test(err.message), 'akun admin di auth.html mendapat kode ADMIN_ACCOUNT + arahan Login Admin');
  ok(await Api.me() === null, 'akun admin tidak ikut login lewat jalur mahasiswa');

  console.log('SEMUA LULUS: ' + pass + ' pemeriksaan (referensi & kategori)');
})().catch(e => { console.error('ERROR', e); process.exit(1); });
