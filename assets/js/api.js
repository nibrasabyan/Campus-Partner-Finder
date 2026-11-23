/*
 * api.js — Lapisan data Campus Partner Finder.
 *
 * Semua halaman HANYA boleh mengambil/menyimpan data lewat objek global `Api`.
 * Implementasi saat ini adalah data tiruan (mock) di localStorage dengan latensi
 * buatan 150 ms. Setiap fungsi mengembalikan Promise.
 *
 * Saat backend siap, cukup ganti ISI tiap fungsi dengan pemanggilan fetch()
 * tanpa mengubah nama maupun parameter fungsinya (lihat README.md).
 */
(function (global) {
  'use strict';

  var DB_KEY = 'cpf_db_v3'; // v3: data awal papan kampanye (3 catatan beda ukuran)
  var SESSION_KEY = 'cpf_session_v1';
  var LATENCY = 150;

  // ---------------------------------------------------------------------------
  // Data referensi: SATU-SATUNYA sumber daftar fakultas, kategori, dan gender.
  // Form profil, filter pencarian, dan validasi submitProfile memakai daftar ini.
  // ---------------------------------------------------------------------------

  // 17 fakultas UB dengan nama terbaru. Beberapa sumber menyebut UB memiliki
  // 18 fakultas; kemungkinan Sekolah Pascasarjana ikut dihitung, padahal ia
  // bukan fakultas tujuan pendaftaran mahasiswa sarjana/vokasi.
  var FAKULTAS = Object.freeze([
    'Fakultas Hukum',
    'Fakultas Ekonomi dan Bisnis',
    'Fakultas Ilmu Administrasi',
    'Fakultas Bio-Industri Pertanian dan Kehutanan',
    'Fakultas Sains dan Teknologi Peternakan',
    'Fakultas Teknik',
    'Fakultas Kedokteran',
    'Fakultas Perikanan dan Ilmu Kelautan',
    'Fakultas Sains, Teknologi, dan Matematika',
    'Fakultas Teknologi Agroindustri dan Biosistem',
    'Fakultas Ilmu Sosial dan Ilmu Politik',
    'Fakultas Ilmu Budaya',
    'Fakultas Kedokteran Hewan',
    'Fakultas Ilmu Komputer',
    'Fakultas Kedokteran Gigi',
    'Fakultas Ilmu Kesehatan',
    'Fakultas Vokasi'
  ]);

  // Kategori bersifat multi-pilih: profil menyimpan array berisi satu atau lebih nilai ini.
  var KATEGORI = Object.freeze(['Interview', 'Project', 'Lomba', 'Study Bersama']);

  var GENDER = Object.freeze(['Laki-laki', 'Perempuan']);

  // ---------------------------------------------------------------------------
  // Utilitas internal
  // ---------------------------------------------------------------------------

  function storage() {
    if (typeof global.localStorage === 'undefined') {
      throw new Error('localStorage tidak tersedia.');
    }
    return global.localStorage;
  }

  function now() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function randomAnonId(db) {
    var hex = '0123456789ABCDEF';
    var id;
    do {
      id = '';
      for (var i = 0; i < 4; i++) id += hex[Math.floor(Math.random() * 16)];
    } while (db.users.some(function (u) { return u.anonId === id; }));
    return id;
  }

  function clone(obj) {
    return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
  }

  // Membungkus hasil dalam Promise dengan latensi buatan.
  function respond(fn) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          resolve(clone(fn()));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }, LATENCY);
    });
  }

  // `code` opsional agar halaman bisa menangani error tertentu secara khusus.
  function fail(message, code) {
    var err = new Error(message);
    if (code) err.code = code;
    throw err;
  }

  // ---------------------------------------------------------------------------
  // Data awal (seed)
  // ---------------------------------------------------------------------------

  function seed() {
    var t = Date.now();
    function ago(minutes) { return new Date(t - minutes * 60000).toISOString(); }

    return {
      users: [
        {
          id: 'u_admin', email: 'admin@ub.ac.id', password: 'admin123', role: 'admin',
          anonId: 'ADM1', status: 'Disetujui', profile: null, ktmFilename: null,
          diambil: false, createdAt: ago(10000), submittedAt: null
        },
        {
          id: 'u_andi', email: 'andi@student.ub.ac.id', password: 'andi123', role: 'mahasiswa',
          anonId: 'A1B2', status: 'Disetujui', ktmFilename: 'ktm_andi.jpg', diambil: false,
          createdAt: ago(9000), submittedAt: ago(8900),
          profile: {
            deskripsi: 'Mahasiswa Informatika yang fokus di data science dan machine learning. Senang ikut lomba data dan diskusi riset.',
            fakultas: 'Fakultas Ilmu Komputer', prodi: 'Teknik Informatika', angkatan: '2023',
            gender: 'Laki-laki', kategori: ['Interview', 'Lomba']
          }
        },
        {
          id: 'u_citra', email: 'citra@student.ub.ac.id', password: 'citra123', role: 'mahasiswa',
          anonId: 'C3D4', status: 'Disetujui', ktmFilename: 'ktm_citra.jpg', diambil: false,
          createdAt: ago(8000), submittedAt: ago(7900),
          profile: {
            deskripsi: 'Suka desain UI/UX dan riset pengguna. Mencari teman project aplikasi mobile atau partner belajar Figma.',
            fakultas: 'Fakultas Ilmu Komputer', prodi: 'Sistem Informasi', angkatan: '2024',
            gender: 'Perempuan', kategori: ['Project', 'Study Bersama']
          }
        },
        {
          id: 'u_eko', email: 'eko@student.ub.ac.id', password: 'eko123', role: 'mahasiswa',
          anonId: 'E5F6', status: 'Disetujui', ktmFilename: 'ktm_eko.jpg', diambil: false,
          createdAt: ago(7000), submittedAt: ago(6900),
          profile: {
            deskripsi: 'Mahasiswa manajemen, aktif di organisasi kewirausahaan. Terbuka untuk lomba business plan dan wawancara tugas kuliah.',
            fakultas: 'Fakultas Ekonomi dan Bisnis', prodi: 'Manajemen', angkatan: '2022',
            gender: 'Laki-laki', kategori: ['Interview', 'Lomba']
          }
        },
        {
          id: 'u_dewi', email: 'dewi@student.ub.ac.id', password: 'dewi123', role: 'mahasiswa',
          anonId: 'G7H8', status: 'Menunggu', ktmFilename: 'ktm_dewi.jpg', diambil: false,
          createdAt: ago(300), submittedAt: ago(290),
          profile: {
            deskripsi: 'Mahasiswa hukum semester awal, ingin mencari teman belajar bersama untuk mata kuliah pengantar.',
            fakultas: 'Fakultas Hukum', prodi: 'Ilmu Hukum', angkatan: '2025',
            gender: 'Perempuan', kategori: ['Project', 'Study Bersama']
          }
        }
      ],
      campaigns: [
        {
          id: 'c_1', ownerId: 'u_citra', status: 'Aktif', createdAt: ago(600),
          deskripsi: 'Mencari narasumber dari Fakultas Ilmu Komputer yang fokus di bidang data dan AI untuk wawancara tugas mata kuliah IMK (sekitar 30 menit).',
          benefit: 'Uang tunai Rp50.000'
        },
        {
          id: 'c_2', ownerId: 'u_eko', status: 'Aktif', createdAt: ago(240),
          deskripsi: 'Butuh 1 anggota tim untuk lomba business plan tingkat nasional bulan depan. Kami sudah punya ide dan analis keuangan, tinggal mencari orang yang bisa merapikan pitch deck dan berani presentasi di depan juri. Latihan dua kali seminggu di FEB.',
          benefit: 'Camilan setiap rapat dan pembagian hadiah rata'
        },
        {
          id: 'c_3', ownerId: 'u_andi', status: 'Aktif', createdAt: ago(45),
          deskripsi: 'Cari teman belajar Kalkulus 2 tiap Kamis sore di perpustakaan.',
          benefit: 'Gantian traktir kopi'
        }
      ],
      connections: [],
      conversations: [],
      notifications: []
    };
  }

  function load() {
    var raw = storage().getItem(DB_KEY);
    if (!raw) {
      var fresh = seed();
      save(fresh);
      return fresh;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      var reset = seed();
      save(reset);
      return reset;
    }
  }

  function save(db) {
    storage().setItem(DB_KEY, JSON.stringify(db));
  }

  function sessionUserId() {
    return storage().getItem(SESSION_KEY);
  }

  function setSession(userId) {
    if (userId) storage().setItem(SESSION_KEY, userId);
    else storage().removeItem(SESSION_KEY);
  }

  // ---------------------------------------------------------------------------
  // Pembantu domain
  // ---------------------------------------------------------------------------

  function findUser(db, id) {
    return db.users.filter(function (u) { return u.id === id; })[0] || null;
  }

  function anonLabel(user) {
    return user ? 'Anonim #' + user.anonId : 'Anonim';
  }

  function currentUser(db) {
    var id = sessionUserId();
    var user = id ? findUser(db, id) : null;
    if (id && !user) setSession(null);
    return user;
  }

  function requireUser(db) {
    var user = currentUser(db);
    if (!user) fail('Sesi berakhir. Masuk lagi untuk melanjutkan.');
    return user;
  }

  function requireApproved(db) {
    var user = requireUser(db);
    if (user.role !== 'mahasiswa') fail('Fitur ini khusus mahasiswa.');
    if (user.status !== 'Disetujui') fail('Akun belum disetujui admin. Cek halaman Status verifikasi.');
    return user;
  }

  function requireAdmin(db) {
    var user = requireUser(db);
    if (user.role !== 'admin') fail('Halaman ini khusus admin.');
    return user;
  }

  // Ringkasan akun untuk sesi (tanpa password).
  function sessionView(user) {
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      anonId: user.anonId,
      label: user.role === 'admin' ? 'Admin' : anonLabel(user),
      status: user.status,
      profileComplete: !!user.profile
    };
  }

  // Profil anonim publik (tanpa email/password/KTM).
  function publicProfile(user) {
    var p = user.profile || {};
    return {
      userId: user.id,
      label: anonLabel(user),
      anonId: user.anonId,
      deskripsi: p.deskripsi || '',
      fakultas: p.fakultas || '',
      prodi: p.prodi || '',
      angkatan: p.angkatan || '',
      gender: p.gender || '',
      kategori: p.kategori || [],
      diambil: !!user.diambil
    };
  }

  function campaignView(db, c) {
    var owner = findUser(db, c.ownerId);
    return {
      id: c.id,
      ownerId: c.ownerId,
      ownerLabel: anonLabel(owner),
      ownerFakultas: owner && owner.profile ? owner.profile.fakultas : '',
      deskripsi: c.deskripsi,
      benefit: c.benefit,
      status: c.status,
      createdAt: c.createdAt
    };
  }

  function notify(db, userId, text, link) {
    db.notifications.push({
      id: uid('n'), userId: userId, text: text, link: link || null, read: false, createdAt: now()
    });
  }

  // Hubungan aktif (menunggu/diterima) milik pengguna terhadap sebuah target.
  function myConnectionTo(db, userId, type, refId) {
    var list = db.connections.filter(function (k) {
      return k.fromId === userId && k.type === type && k.refId === refId && k.status !== 'Ditolak';
    });
    return list.length ? list[list.length - 1] : null;
  }

  function connectionView(db, k) {
    var from = findUser(db, k.fromId);
    var title;
    if (k.type === 'campaign') {
      var c = db.campaigns.filter(function (x) { return x.id === k.refId; })[0];
      title = c ? 'Kampanye: ' + c.deskripsi : 'Kampanye';
    } else {
      title = 'Profil Anda';
    }
    return {
      id: k.id,
      type: k.type,
      refId: k.refId,
      fromLabel: anonLabel(from),
      fromProfile: from ? publicProfile(from) : null,
      title: title,
      status: k.status,
      conversationId: k.conversationId || null,
      createdAt: k.createdAt
    };
  }

  function refTitle(db, type, refId) {
    if (type === 'campaign') {
      var c = db.campaigns.filter(function (x) { return x.id === refId; })[0];
      return c ? c.deskripsi : 'Kampanye';
    }
    var u = findUser(db, refId);
    return 'Profil ' + anonLabel(u);
  }

  function conversationSummary(db, conv, me) {
    var otherId = conv.participants[0] === me.id ? conv.participants[1] : conv.participants[0];
    var other = findUser(db, otherId);
    var last = conv.messages.length ? conv.messages[conv.messages.length - 1] : null;
    return {
      id: conv.id,
      type: conv.type,
      refId: conv.refId,
      refTitle: refTitle(db, conv.type, conv.refId),
      partnerLabel: anonLabel(other),
      partnerId: otherId,
      lastMessage: last ? last.text : '',
      lastAt: last ? last.createdAt : conv.createdAt,
      deal: !!conv.deal,
      closed: !!conv.closed
    };
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
  }

  function validateCredentials(email, password) {
    if (!email || !password) fail('Isi email dan password.');
    if (!validEmail(email)) fail('Email belum lengkap. Contoh: nama@student.ub.ac.id');
    if (String(password).length < 6) fail('Password minimal 6 karakter. Tambahkan huruf atau angka.');
  }

  // ---------------------------------------------------------------------------
  // API publik
  // ---------------------------------------------------------------------------

  var Api = {
    // ----- Data referensi (dipakai halaman untuk mengisi form dan filter) ---
    FAKULTAS: FAKULTAS,
    KATEGORI: KATEGORI,
    GENDER: GENDER,

    // ----- Sesi dan akun ----------------------------------------------------

    /** Mengembalikan akun yang sedang masuk, atau null. */
    me: function () {
      return respond(function () {
        var db = load();
        var user = currentUser(db);
        return user ? sessionView(user) : null;
      });
    },

    /** Mendaftarkan mahasiswa baru lalu langsung masuk. */
    register: function (data) {
      return respond(function () {
        var db = load();
        var email = String((data && data.email) || '').trim().toLowerCase();
        var password = (data && data.password) || '';
        validateCredentials(email, password);
        if (db.users.some(function (u) { return u.email === email; })) {
          fail('Email ini sudah terdaftar. Pakai tab Masuk.');
        }
        var user = {
          id: uid('u'), email: email, password: password, role: 'mahasiswa',
          anonId: randomAnonId(db), status: 'Belum Lengkap', profile: null,
          ktmFilename: null, diambil: false, createdAt: now(), submittedAt: null
        };
        db.users.push(user);
        save(db);
        setSession(user.id);
        return sessionView(user);
      });
    },

    /** Mendaftarkan akun admin baru lalu langsung masuk. */
    registerAdmin: function (data) {
      return respond(function () {
        var db = load();
        var email = String((data && data.email) || '').trim().toLowerCase();
        var password = (data && data.password) || '';
        validateCredentials(email, password);
        if (db.users.some(function (u) { return u.email === email; })) {
          fail('Email ini sudah terdaftar. Pakai tab Login.');
        }
        var user = {
          id: uid('u'), email: email, password: password, role: 'admin',
          anonId: randomAnonId(db), status: 'Disetujui', profile: null,
          ktmFilename: null, diambil: false, createdAt: now(), submittedAt: null
        };
        db.users.push(user);
        save(db);
        setSession(user.id);
        return sessionView(user);
      });
    },

    /** Masuk. `role` opsional: 'mahasiswa' atau 'admin' untuk membatasi jenis akun. */
    login: function (data) {
      return respond(function () {
        var db = load();
        var email = String((data && data.email) || '').trim().toLowerCase();
        var password = (data && data.password) || '';
        if (!email || !password) fail('Isi email dan password.');
        var user = db.users.filter(function (u) { return u.email === email; })[0];
        if (!user || user.password !== password) fail('Email atau password tidak cocok. Periksa lagi, lalu coba masuk.');
        if (data.role && data.role !== user.role) {
          if (data.role === 'admin') fail('Akun ini bukan akun admin. Mahasiswa masuk lewat halaman Masuk.', 'NOT_ADMIN');
          fail('Ini akun admin. Masuk lewat halaman Login admin.', 'ADMIN_ACCOUNT');
        }
        setSession(user.id);
        return sessionView(user);
      });
    },

    logout: function () {
      return respond(function () {
        setSession(null);
        return true;
      });
    },

    // ----- Profil -----------------------------------------------------------

    getMyProfile: function () {
      return respond(function () {
        var db = load();
        var user = requireUser(db);
        return {
          account: sessionView(user),
          profile: user.profile,
          ktmFilename: user.ktmFilename,
          submittedAt: user.submittedAt
        };
      });
    },

    /**
     * Menyimpan profil anonim beserta nama berkas KTM.
     * Jika status belum Disetujui, status menjadi "Menunggu" (masuk antrean admin).
     * Jika sudah Disetujui, perubahan profil disimpan tanpa verifikasi ulang.
     */
    submitProfile: function (data, ktmFilename) {
      return respond(function () {
        var db = load();
        var user = requireUser(db);
        if (user.role !== 'mahasiswa') fail('Hanya mahasiswa yang memiliki profil anonim.');
        data = data || {};
        var required = ['deskripsi', 'fakultas', 'prodi', 'angkatan', 'gender'];
        required.forEach(function (key) {
          if (!String(data[key] || '').trim()) fail('Lengkapi semua isian profil.');
        });
        if (FAKULTAS.indexOf(data.fakultas) === -1) fail('Fakultas tidak dikenal. Pilih fakultas dari daftar.');
        if (GENDER.indexOf(data.gender) === -1) fail('Pilih Laki-laki atau Perempuan.');
        if (!Array.isArray(data.kategori) || data.kategori.length === 0) {
          fail('Pilih minimal satu kategori partner.');
        }
        if (data.kategori.some(function (k) { return KATEGORI.indexOf(k) === -1; })) {
          fail('Kategori tidak dikenal. Pilih dari Interview, Project, Lomba, atau Study Bersama.');
        }
        // Hilangkan duplikat, urutkan sesuai daftar KATEGORI.
        var kategoriBersih = KATEGORI.filter(function (k) { return data.kategori.indexOf(k) !== -1; });
        var newKtm = ktmFilename || null;
        if (!newKtm && !user.ktmFilename) fail('Unggah foto KTM agar admin bisa memverifikasi akun.');

        user.profile = {
          deskripsi: String(data.deskripsi).trim(),
          fakultas: data.fakultas,
          prodi: String(data.prodi).trim(),
          angkatan: String(data.angkatan).trim(),
          gender: data.gender,
          kategori: kategoriBersih
        };
        if (newKtm) user.ktmFilename = newKtm;

        if (user.status !== 'Disetujui') {
          user.status = 'Menunggu';
          user.submittedAt = now();
        }
        save(db);
        return sessionView(user);
      });
    },

    // ----- Kampanye ---------------------------------------------------------

    listCampaigns: function () {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        return db.campaigns
          .slice()
          .sort(function (a, b) {
            // Kampanye aktif di atas, lalu yang terbaru.
            if (a.status !== b.status) return a.status === 'Aktif' ? -1 : 1;
            return a.createdAt < b.createdAt ? 1 : -1;
          })
          .map(function (c) {
            var v = campaignView(db, c);
            v.isOwner = c.ownerId === me.id;
            return v;
          });
      });
    },

    getCampaign: function (id) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var c = db.campaigns.filter(function (x) { return x.id === id; })[0];
        if (!c) fail('Kampanye tidak ditemukan.');
        var v = campaignView(db, c);
        v.isOwner = c.ownerId === me.id;
        var mine = myConnectionTo(db, me.id, 'campaign', c.id);
        v.myConnection = mine ? { id: mine.id, status: mine.status, conversationId: mine.conversationId || null } : null;
        v.requests = v.isOwner
          ? db.connections
            .filter(function (k) { return k.type === 'campaign' && k.refId === c.id; })
            .map(function (k) { return connectionView(db, k); })
          : [];
        return v;
      });
    },

    createCampaign: function (data) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var deskripsi = String((data && data.deskripsi) || '').trim();
        var benefit = String((data && data.benefit) || '').trim();
        if (!deskripsi || !benefit) fail('Isi deskripsi dan benefit kampanye.');
        if (deskripsi.length < 20) fail('Deskripsi minimal 20 karakter. Tambahkan tujuan dan kriteria partner.');
        var c = { id: uid('c'), ownerId: me.id, deskripsi: deskripsi, benefit: benefit, status: 'Aktif', createdAt: now() };
        db.campaigns.push(c);
        save(db);
        var v = campaignView(db, c);
        v.isOwner = true;
        return v;
      });
    },

    // ----- Connect ----------------------------------------------------------

    /** Mengirim permintaan connect ke kampanye atau profil. */
    connect: function (data) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var type = data && data.type;
        var refId = data && data.refId;
        var toId;
        if (type === 'campaign') {
          var c = db.campaigns.filter(function (x) { return x.id === refId; })[0];
          if (!c) fail('Kampanye tidak ditemukan.');
          if (c.status === 'Diambil') fail('Kampanye ini sudah diambil. Cari kampanye lain di papan.');
          if (c.ownerId === me.id) fail('Ini kampanye Anda sendiri. Tunggu mahasiswa lain mengirim Connect.');
          toId = c.ownerId;
        } else if (type === 'profile') {
          var target = findUser(db, refId);
          if (!target || target.role !== 'mahasiswa' || target.status !== 'Disetujui') fail('Profil tidak ditemukan.');
          if (target.id === me.id) fail('Ini profil Anda sendiri.');
          if (target.diambil) fail('Profil ini sudah diambil. Cari partner lain.');
          toId = target.id;
        } else {
          fail('Jenis connect tidak dikenal.');
        }
        if (myConnectionTo(db, me.id, type, refId)) fail('Permintaan Connect sudah terkirim. Tunggu jawabannya di Notifikasi.');

        var k = {
          id: uid('k'), type: type, refId: refId, fromId: me.id, toId: toId,
          status: 'Menunggu', conversationId: null, createdAt: now()
        };
        db.connections.push(k);
        notify(db, toId,
          anonLabel(me) + (type === 'campaign' ? ' mengirim Connect ke kampanye Anda.' : ' mengirim Connect ke profil Anda.'),
          'notifications.html');
        save(db);
        return { id: k.id, status: k.status };
      });
    },

    /** Daftar permintaan connect yang masuk ke pengguna saat ini. */
    listIncomingConnections: function () {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        return db.connections
          .filter(function (k) { return k.toId === me.id; })
          .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
          .map(function (k) { return connectionView(db, k); });
      });
    },

    /** Menerima (accept=true) atau menolak permintaan connect. */
    respondConnection: function (id, accept) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var k = db.connections.filter(function (x) { return x.id === id; })[0];
        if (!k || k.toId !== me.id) fail('Permintaan connect tidak ditemukan.');
        if (k.status !== 'Menunggu') fail('Permintaan ini sudah dijawab. Muat ulang halaman.');

        if (!accept) {
          k.status = 'Ditolak';
          notify(db, k.fromId, anonLabel(me) + ' menolak permintaan Connect Anda.', null);
          save(db);
          return { id: k.id, status: k.status, conversationId: null };
        }

        var taken = k.type === 'campaign'
          ? (db.campaigns.filter(function (x) { return x.id === k.refId; })[0] || {}).status === 'Diambil'
          : !!(findUser(db, k.refId) || {}).diambil;
        if (taken) fail('Kampanye atau profil ini sudah diambil, jadi permintaan tidak bisa diterima.');

        var conv = {
          id: uid('r'), connectionId: k.id, type: k.type, refId: k.refId,
          participants: [k.toId, k.fromId], messages: [], deal: false, closed: false,
          createdAt: now()
        };
        db.conversations.push(conv);
        k.status = 'Diterima';
        k.conversationId = conv.id;
        notify(db, k.fromId, anonLabel(me) + ' menerima Connect Anda. Obrolan sudah terbuka.',
          'chat.html?id=' + conv.id);
        save(db);
        return { id: k.id, status: k.status, conversationId: conv.id };
      });
    },

    // ----- Cari Partner -----------------------------------------------------

    /** Filter: kategori ('Semua' = semua), fakultas ('Semua' = semua), gender ('Random' = semua). */
    searchProfiles: function (filter) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        filter = filter || {};
        var kategori = filter.kategori && filter.kategori !== 'Semua' ? filter.kategori : null;
        var fakultas = filter.fakultas && filter.fakultas !== 'Semua' ? filter.fakultas : null;
        var gender = filter.gender && filter.gender !== 'Random' ? filter.gender : null;
        return db.users
          .filter(function (u) {
            if (u.id === me.id || u.role !== 'mahasiswa' || u.status !== 'Disetujui' || !u.profile) return false;
            // Kategori multi-pilih: cocok jika kategori yang dicari termasuk di array profil.
            if (kategori && !(u.profile.kategori || []).includes(kategori)) return false;
            if (fakultas && u.profile.fakultas !== fakultas) return false;
            if (gender && u.profile.gender !== gender) return false;
            return true;
          })
          .sort(function (a, b) { return (a.diambil ? 1 : 0) - (b.diambil ? 1 : 0); })
          .map(publicProfile);
      });
    },

    getPartner: function (userId) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var u = findUser(db, userId);
        if (!u || u.role !== 'mahasiswa' || u.status !== 'Disetujui' || !u.profile) fail('Profil tidak ditemukan.');
        var v = publicProfile(u);
        v.isMe = u.id === me.id;
        var mine = myConnectionTo(db, me.id, 'profile', u.id);
        v.myConnection = mine ? { id: mine.id, status: mine.status, conversationId: mine.conversationId || null } : null;
        return v;
      });
    },

    // ----- Room Chat --------------------------------------------------------

    listConversations: function () {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        return db.conversations
          .filter(function (c) { return c.participants.indexOf(me.id) !== -1; })
          .map(function (c) { return conversationSummary(db, c, me); })
          .sort(function (a, b) { return a.lastAt < b.lastAt ? 1 : -1; });
      });
    },

    getConversation: function (id) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var conv = db.conversations.filter(function (c) { return c.id === id; })[0];
        if (!conv || conv.participants.indexOf(me.id) === -1) fail('Percakapan tidak ditemukan.');
        var v = conversationSummary(db, conv, me);
        v.myId = me.id;
        v.dealAt = conv.dealAt || null;
        v.messages = conv.messages.map(function (m) {
          return { id: m.id, mine: m.fromId === me.id, text: m.text, createdAt: m.createdAt };
        });
        return v;
      });
    },

    sendMessage: function (id, text) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var conv = db.conversations.filter(function (c) { return c.id === id; })[0];
        if (!conv || conv.participants.indexOf(me.id) === -1) fail('Percakapan tidak ditemukan.');
        if (conv.closed) fail('Obrolan ditutup karena Deal sudah dibuat.');
        text = String(text || '').trim();
        if (!text) fail('Tulis pesan dulu, lalu kirim.');
        if (text.length > 1000) fail('Pesan maksimal 1000 karakter. Bagi menjadi beberapa pesan.');
        var msg = { id: uid('m'), fromId: me.id, text: text, createdAt: now() };
        conv.messages.push(msg);
        save(db);
        return { id: msg.id, mine: true, text: msg.text, createdAt: msg.createdAt };
      });
    },

    /**
     * Menandai kesepakatan (Deal). Status kampanye/profil menjadi "Diambil",
     * semua room chat untuk target yang sama ditutup, dan permintaan connect
     * yang masih menunggu otomatis ditolak.
     */
    markDeal: function (id) {
      return respond(function () {
        var db = load();
        var me = requireApproved(db);
        var conv = db.conversations.filter(function (c) { return c.id === id; })[0];
        if (!conv || conv.participants.indexOf(me.id) === -1) fail('Percakapan tidak ditemukan.');
        if (conv.closed) fail('Deal untuk kampanye atau profil ini sudah dibuat.');

        if (conv.type === 'campaign') {
          var c = db.campaigns.filter(function (x) { return x.id === conv.refId; })[0];
          if (c) c.status = 'Diambil';
        } else {
          var target = findUser(db, conv.refId);
          if (target) target.diambil = true;
        }

        var stamp = now();
        conv.deal = true;
        conv.dealAt = stamp;
        db.conversations.forEach(function (other) {
          if (other.type === conv.type && other.refId === conv.refId) other.closed = true;
        });
        db.connections.forEach(function (k) {
          if (k.type === conv.type && k.refId === conv.refId && k.status === 'Menunggu') k.status = 'Ditolak';
        });

        var otherId = conv.participants[0] === me.id ? conv.participants[1] : conv.participants[0];
        notify(db, otherId, anonLabel(me) + ' menekan Deal. Statusnya sekarang Diambil.',
          'chat.html?id=' + conv.id);
        save(db);
        return conversationSummary(db, conv, me);
      });
    },

    // ----- Notifikasi -------------------------------------------------------

    listNotifications: function () {
      return respond(function () {
        var db = load();
        var me = requireUser(db);
        return db.notifications
          .filter(function (n) { return n.userId === me.id; })
          .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      });
    },

    markAllRead: function () {
      return respond(function () {
        var db = load();
        var me = requireUser(db);
        db.notifications.forEach(function (n) { if (n.userId === me.id) n.read = true; });
        save(db);
        return true;
      });
    },

    unreadCount: function () {
      return respond(function () {
        var db = load();
        var me = currentUser(db);
        if (!me) return 0;
        return db.notifications.filter(function (n) { return n.userId === me.id && !n.read; }).length;
      });
    },

    // ----- Admin ------------------------------------------------------------

    /** Daftar mahasiswa berstatus Menunggu, yang terlama di atas. */
    adminQueue: function () {
      return respond(function () {
        var db = load();
        requireAdmin(db);
        return db.users
          .filter(function (u) { return u.role === 'mahasiswa' && u.status === 'Menunggu'; })
          .sort(function (a, b) { return a.submittedAt < b.submittedAt ? -1 : 1; })
          .map(function (u) {
            return {
              id: u.id, label: anonLabel(u), email: u.email,
              fakultas: u.profile ? u.profile.fakultas : '',
              prodi: u.profile ? u.profile.prodi : '',
              angkatan: u.profile ? u.profile.angkatan : '',
              submittedAt: u.submittedAt
            };
          });
      });
    },

    adminGetUser: function (id) {
      return respond(function () {
        var db = load();
        requireAdmin(db);
        var u = findUser(db, id);
        if (!u || u.role !== 'mahasiswa') fail('Pengguna tidak ditemukan.');
        return {
          id: u.id, label: anonLabel(u), email: u.email, status: u.status,
          profile: u.profile, ktmFilename: u.ktmFilename, submittedAt: u.submittedAt
        };
      });
    },

    /** status: 'Disetujui' atau 'Ditolak'. */
    adminReview: function (id, status) {
      return respond(function () {
        var db = load();
        requireAdmin(db);
        if (status !== 'Disetujui' && status !== 'Ditolak') fail('Status verifikasi tidak valid.');
        var u = findUser(db, id);
        if (!u || u.role !== 'mahasiswa') fail('Pengguna tidak ditemukan.');
        if (u.status !== 'Menunggu') fail('Pengguna ini sudah diverifikasi. Kembali ke antrean.');
        u.status = status;
        notify(db, u.id, status === 'Disetujui'
          ? 'KTM Anda disetujui. Papan kampanye dan Cari partner sudah terbuka.'
          : 'KTM Anda ditolak. Unggah ulang foto KTM yang jelas dan terbaca.',
        'status.html');
        save(db);
        return { id: u.id, status: u.status };
      });
    },

    // ----- Khusus pengembangan (bukan bagian kontrak backend) ---------------

    /** Mengembalikan data ke kondisi awal. Panggil dari console: Api._resetDemo() */
    _resetDemo: function () {
      return respond(function () {
        save(seed());
        setSession(null);
        return true;
      });
    }
  };

  global.Api = Api;
})(typeof window !== 'undefined' ? window : globalThis);
