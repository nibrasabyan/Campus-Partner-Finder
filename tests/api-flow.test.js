// Uji alur lengkap api.js + aturan akses app.js di Node. Jalankan: node tests/api-flow.test.js
const path = require('path');
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const root = process.argv[2] || path.join(__dirname, "..");
require(path.join(root, 'assets/js/api.js'));
require(path.join(root, 'assets/js/app.js'));
const { Api, App } = globalThis;
let pass = 0;
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exit(1); } pass++; };
const rejects = async (p, m) => { let threw = false; try { await p; } catch (e) { threw = true; } ok(threw, m + ' (seharusnya ditolak)'); };
const as = async (email, password, role) => { await Api.logout(); return Api.login({ email, password, role }); };

(async () => {
  ok(await Api.me() === null, 'awal belum login');
  ok(App.guard('approved', 'dashboard', null) === 'auth.html', 'tamu -> auth');
  ok(App.guard('admin', 'admin-queue', null) === 'admin-login.html', 'tamu admin -> admin-login');
  await rejects(Api.register({ email: 'x', password: '123456' }), 'email tidak valid');
  await rejects(Api.register({ email: 'new@student.ub.ac.id', password: '123' }), 'password pendek');
  let u = await Api.register({ email: 'new@student.ub.ac.id', password: 'rahasia1' });
  ok(u.status === 'Belum Lengkap', 'status awal');
  ok(App.guard('approved', 'dashboard', u) === 'profile.html', 'belum lengkap -> profile');
  ok(App.guard('auth', 'chats', u) !== null, 'belum disetujui tidak boleh chats');
  ok(App.guard('auth', 'profile', u) === null, 'boleh profile');
  ok(App.guard('admin', 'admin-queue', u) !== null, 'mahasiswa tidak boleh admin');
  await rejects(Api.listCampaigns(), 'api kampanye ditolak sebelum disetujui');
  const prof = { deskripsi: 'Halo saya baru', fakultas: 'Fakultas Ilmu Komputer', prodi: 'TI', angkatan: '2024', gender: 'Perempuan', kategori: ['Interview'] };
  await rejects(Api.submitProfile(prof, null), 'KTM wajib');
  u = await Api.submitProfile(prof, 'ktm.jpg');
  ok(u.status === 'Menunggu', 'status Menunggu');
  ok(App.guard('approved', 'search', u) === 'status.html', 'menunggu -> status');
  const newId = u.id;

  await Api.logout();
  await rejects(Api.login({ email: 'admin@ub.ac.id', password: 'admin123', role: 'mahasiswa' }), 'admin lewat login mahasiswa ditolak');
  const adm = await Api.login({ email: 'admin@ub.ac.id', password: 'admin123', role: 'admin' });
  ok(App.guard('approved', 'dashboard', adm) === 'admin-queue.html', 'admin -> queue');
  let q = await Api.adminQueue(); ok(q.length === 2, 'antrean 2: ' + q.length);
  const detail = await Api.adminGetUser(newId);
  ok(detail.email === 'new@student.ub.ac.id' && detail.ktmFilename === 'ktm.jpg', 'admin lihat email & KTM');
  await Api.adminReview(newId, 'Ditolak');

  await as('new@student.ub.ac.id', 'rahasia1');
  ok((await Api.me()).status === 'Ditolak', 'Ditolak');
  u = await Api.submitProfile(prof, 'ktm2.jpg');
  ok(u.status === 'Menunggu', 'unggah ulang -> Menunggu');
  await as('admin@ub.ac.id', 'admin123', 'admin');
  await Api.adminReview(newId, 'Disetujui');
  q = await Api.adminQueue(); ok(q.length === 1, 'antrean berkurang');

  // Kampanye (Inbound)
  u = await as('new@student.ub.ac.id', 'rahasia1');
  ok(u.status === 'Disetujui' && App.guard('approved', 'dashboard', u) === null, 'disetujui boleh dashboard');
  ok((await Api.unreadCount()) >= 2, 'notif verifikasi');
  await rejects(Api.createCampaign({ deskripsi: 'pendek', benefit: 'x' }), 'deskripsi < 20');
  const camp = await Api.createCampaign({ deskripsi: 'Mencari teman lomba UI/UX tingkat nasional', benefit: 'Camilan' });
  ok((await Api.listCampaigns()).some(c => c.id === camp.id), 'kampanye tampil di banner');
  await rejects(Api.connect({ type: 'campaign', refId: camp.id }), 'connect ke kampanye sendiri ditolak');
  await as('andi@student.ub.ac.id', 'andi123');
  await Api.connect({ type: 'campaign', refId: camp.id });
  await rejects(Api.connect({ type: 'campaign', refId: camp.id }), 'connect ganda ditolak');
  await as('eko@student.ub.ac.id', 'eko123');
  await Api.connect({ type: 'campaign', refId: camp.id });
  await as('new@student.ub.ac.id', 'rahasia1');
  let inc = await Api.listIncomingConnections(); ok(inc.length === 2, '2 permintaan masuk');
  ok((await Api.getCampaign(camp.id)).requests.length === 2, 'pemilik lihat permintaan');
  const fromAndi = inc.find(k => k.fromLabel === 'Anonim #A1B2');
  const r = await Api.respondConnection(fromAndi.id, true); ok(r.conversationId, 'room chat dibuka');
  await Api.sendMessage(r.conversationId, 'Halo Andi!');
  await as('andi@student.ub.ac.id', 'andi123');
  const convs = await Api.listConversations(); ok(convs.length === 1 && convs[0].lastMessage === 'Halo Andi!', 'andi lihat chat');
  await Api.sendMessage(r.conversationId, 'Siap, deal ya');
  await Api.markDeal(r.conversationId);
  ok((await Api.getCampaign(camp.id)).status === 'Diambil', 'kampanye Diambil');
  await rejects(Api.sendMessage(r.conversationId, 'lagi'), 'chat ditutup setelah deal');
  await as('citra@student.ub.ac.id', 'citra123');
  await rejects(Api.connect({ type: 'campaign', refId: camp.id }), 'connect setelah diambil ditolak');
  await as('new@student.ub.ac.id', 'rahasia1');
  inc = await Api.listIncomingConnections();
  ok(inc.find(k => k.fromLabel === 'Anonim #E5F6').status === 'Ditolak', 'permintaan lain otomatis ditolak');

  // Cari Sendiri (Outbound)
  let res = await Api.searchProfiles({ kategori: 'Lomba', fakultas: 'Semua', gender: 'Random' });
  ok(res.length === 2, 'filter kategori Lomba: ' + res.length);
  res = await Api.searchProfiles({ kategori: 'Semua', fakultas: 'Fakultas Ilmu Komputer', gender: 'Perempuan' });
  ok(res.length === 1 && res[0].anonId === 'C3D4', 'filter fakultas+gender');
  ok(!(await Api.searchProfiles({})).some(p => p.anonId === 'G7H8'), 'yang Menunggu tidak muncul');
  await Api.connect({ type: 'profile', refId: 'u_citra' });
  ok((await Api.getPartner('u_citra')).myConnection.status === 'Menunggu', 'status connect profil');
  await as('citra@student.ub.ac.id', 'citra123');
  inc = await Api.listIncomingConnections();
  const r2 = await Api.respondConnection(inc[0].id, true);
  await Api.markDeal(r2.conversationId);
  await as('andi@student.ub.ac.id', 'andi123');
  ok((await Api.getPartner('u_citra')).diambil === true, 'profil Diambil');
  await rejects(Api.connect({ type: 'profile', refId: 'u_citra' }), 'connect profil diambil ditolak');
  await Api.logout(); ok(await Api.me() === null, 'logout');
  console.log('SEMUA LULUS: ' + pass + ' pemeriksaan');
})().catch(e => { console.error('ERROR', e); process.exit(1); });
