# Campus Partner Finder — Frontend

Frontend aplikasi **Campus Partner Finder** untuk Tugas Desain Interaksi, mata kuliah Interaksi Manusia dan Komputer (Teknik Informatika, FILKOM UB). Aplikasi ini mempertemukan mahasiswa Universitas Brawijaya untuk mencari partner **interview, project, lomba, atau study bersama** secara anonim.

- **Teknologi:** HTML, CSS, dan JavaScript murni. **Bootstrap 5.3.3** dari CDN dipakai untuk grid dan utilitas, dengan tampilan semua komponennya ditimpa di `assets/css/style.css`. Font dimuat dari Google Fonts. Tidak ada build step.
- **Responsif (RWD):** grid Bootstrap, navbar yang collapse di layar kecil, dan panel filter yang menjadi bottom sheet di mobile. Sudah diuji di lebar 375, 768, dan 1280 px.
- **Data:** saat ini disimpan di `localStorage` melalui satu lapisan data (`assets/js/api.js`) yang nantinya bisa diganti ke backend.

## Cara menjalankan

Bootstrap dan font dimuat dari internet, jadi komputer perlu tersambung ke internet.

Cara yang disarankan adalah menjalankan server statis lokal, karena beberapa browser memperlakukan `localStorage` secara berbeda untuk alamat `file://`. Pilih salah satu:

```bash
# Python
python -m http.server 8000
# atau Node
npx serve .
```

Lalu buka `http://localhost:8000/index.html`. Di VS Code, ekstensi **Live Server** juga bisa dipakai (klik kanan `index.html`, lalu **Open with Live Server**).

**Mengembalikan data demo:** buka console browser (F12), lalu jalankan `Api._resetDemo()` dan muat ulang halaman.

## Akun demo

| Peran | Email | Password | Status | Nama anonim | Fakultas | Kategori |
|---|---|---|---|---|---|---|
| Admin | admin@ub.ac.id | admin123 | — | — | — | — |
| Mahasiswa | andi@student.ub.ac.id | andi123 | Disetujui | Anonim #A1B2 | Ilmu Komputer | Interview, Lomba |
| Mahasiswa | citra@student.ub.ac.id | citra123 | Disetujui | Anonim #C3D4 | Ilmu Komputer | Project, Study Bersama |
| Mahasiswa | eko@student.ub.ac.id | eko123 | Disetujui | Anonim #E5F6 | Ekonomi dan Bisnis | Interview, Lomba |
| Mahasiswa | dewi@student.ub.ac.id | dewi123 | Menunggu | Anonim #G7H8 | Hukum | Project, Study Bersama |

Admin masuk lewat **`admin-login.html`**, bukan lewat `auth.html`.

Data awal berisi tiga kampanye dengan panjang berbeda, supaya papan memperlihatkan tiga ukuran catatan:

| Pemilik | Kampanye | Panjang deskripsi | Ukuran catatan |
|---|---|---|---|
| Andi | Teman belajar Kalkulus 2 | Pendek | Kecil |
| Citra | Narasumber data dan AI | Sedang | Sedang |
| Eko | Anggota tim lomba business plan | Panjang | Lebar, dua kolom |

Kunci penyimpanan data sekarang `cpf_db_v3`, jadi data demo lama di browser otomatis diganti dengan data awal yang baru.

**Skenario demo cepat (bisa dipakai saat presentasi):**
1. Masuk sebagai **Andi**. Buka catatan Citra di Papan kampanye, lalu tekan **Connect**. Sebuah garis tergambar dari catatan ke kolom samping.
2. Keluar, lalu masuk sebagai **Citra**. Buka **Notifikasi** dan tekan **Terima**. Titiknya berubah hijau dan obrolan terbuka.
3. Kirim pesan, tekan **Deal**, lalu konfirmasi di modal. Cap merah **Diambil** menempel di kartu kampanye asal.
4. Masuk sebagai **Admin**, buka Antrean KTM, periksa **Dewi**, lalu tekan **Setujui**.

## Desain

Konsepnya **papan pengumuman kampus untuk orang yang belum saling kenal**.
- Kampanye adalah catatan yang ditempel di papan.
- Profil anonim adalah kartu yang identitasnya tersembunyi.
- Deal adalah cap stempel.

Hanya catatan kampanye yang miring dan bergerak. Elemen lain dibuat tenang agar momen cap "Diambil" menonjol.

**Palet** (semua warna Bootstrap bawaan diganti):

| Nama | Hex | Peran |
|---|---|---|
| Kertas | `#ECEBF3` | Latar |
| Tinta | `#1C1B2E` | Teks utama, garis fokus |
| Stempel | `#E5412D` | Cap Diambil (grafis dan teks besar) |
| Stempel tua | `#C2301E` | Teks error, tombol Tolak dan Deal (5,6 : 1 dengan putih) |
| Sinyal | `#0F8F7A` | Titik Aktif/Terhubung, batas UI |
| Sinyal tua | `#0B7566` | Tombol utama bertulisan putih (5,6 : 1) |
| Kuning highlighter | `#FFD23F` | Tag kategori, titik Menunggu |

Warna Sinyal dan Stempel asli hanya mencapai sekitar 4 : 1 dengan teks putih, jadi untuk teks kecil dipakai varian "tua".

**Tipografi.**
- **Bricolage Grotesque** untuk judul, dengan lebar 75–80 % dan berat 760–800. Juga dipakai untuk teks catatan pendek.
- **Atkinson Hyperlegible** untuk teks isi dan UI.
- Skala 14, 17, 21, 26, 33, dan 41 px. Paragraf dibatasi 62 karakter per baris.

**Gerak** (semua dimatikan oleh `prefers-reduced-motion: reduce`, dan status akhirnya tetap terlihat):
- **Momen utama:** catatan ditempel satu per satu di Papan kampanye dan Beranda. Jeda antarcatatan 80 ms, durasi 560 ms, easing `cubic-bezier(.2,.9,.25,1.2)`.
- **Connect:** garis penghubung tergambar dari catatan ke kolom respons dalam 400 ms.
- **Terima:** kartu respons atau titik linimasa berubah menjadi "Terhubung", dan tanda centang muncul.
- **Deal:** cap "Diambil" muncul dengan skala 1,4 → 1 pada kemiringan −8°, disertai getaran 120 ms.
- **Pesan baru:** bubble masuk dari sisi pengirimnya dalam 180 ms.
- Kartu tidak bergerak saat di-hover. Hanya tombol dan tautan yang berubah.

## Peta halaman

| File | ID sitemap | Nama di navigasi | Akses |
|---|---|---|---|
| `index.html` | 1.1 Beranda | — | Publik |
| `auth.html` | 2.1 Daftar / Masuk (tab, bisa dibuka langsung dengan `?tab=daftar`) | Masuk, Daftar | Publik |
| `profile.html` | 3.3 Profil Anonim + unggah KTM | Profil | Login |
| `status.html` | 3.4 Status Verifikasi | Status verifikasi | Login |
| `dashboard.html` | 3.2 Dashboard: papan kampanye | Papan kampanye | Disetujui |
| `campaign-new.html` | 4.2 Buat Kampanye, dengan pratinjau catatan | Pasang kampanye | Disetujui |
| `campaign.html?id=` | 4.3 Detail Kampanye + 4.4 Respons / Connect | — | Disetujui |
| `search.html` | 5.2 Filter + 5.3 Hasil Pencarian | Cari partner | Disetujui |
| `partner.html?id=` | 5.4 Profil Partner | — | Disetujui |
| `chats.html` | 6.1 Room Chat: daftar percakapan | Obrolan | Disetujui |
| `chat.html?id=` | 6.2 Percakapan + 6.3 Deal (modal) + 6.4 Status Diambil | — | Disetujui |
| `notifications.html` | 8.2 Notifikasi Connect | Notifikasi | Disetujui |
| `admin-login.html` | 7.1–7.2 Login / Signup Admin | Login admin | Publik |
| `admin-queue.html` | 7.3 Antrean KTM | Antrean KTM | Admin |
| `admin-review.html?id=` | 7.4 Detail Verifikasi + 7.5 Setujui / Tolak | — | Admin |

Label navigasi memakai kata sehari-hari, bukan nama fitur internal. Contohnya "Papan kampanye" untuk Dashboard, "Pasang kampanye" untuk Buat Kampanye, dan "Obrolan" untuk Room Chat. Nomor sitemap tetap tercatat di komentar setiap file HTML.

**Navigasi global** setelah login:
- **Mahasiswa yang sudah disetujui:** Notifikasi (dengan jumlah belum dibaca), Obrolan, dan menu akun **Anonim #XXXX** yang berisi Profil, Status verifikasi, dan Keluar. Menu akun berupa `<button>`, jadi bisa dipakai dengan keyboard: **Tab** untuk fokus, **Enter** untuk membuka, panah untuk berpindah item, dan **Esc** untuk menutup. Di mobile, menu ini ada di dalam navbar yang dibuka lewat tombol toggler.
- **Mahasiswa yang belum disetujui:** hanya Profil, Status verifikasi, dan Keluar.
- **Admin:** hanya Antrean KTM dan Keluar.

**Aturan akses** diterapkan di `App.init` (`assets/js/app.js`) berdasarkan atribut `data-access` pada `<body>`:
1. Pengguna yang belum login dan membuka halaman non-publik diarahkan ke `auth.html`. Untuk halaman admin, tujuannya `admin-login.html`.
2. Mahasiswa yang belum disetujui (Belum Lengkap, Menunggu, atau Ditolak) hanya bisa membuka `profile.html` dan `status.html`.
3. Halaman Kampanye, Cari partner, Obrolan, dan Notifikasi baru terbuka setelah status **Disetujui**. Aturan yang sama juga diperiksa di `api.js`, agar tidak bisa diakali dari console.
4. Admin selalu diarahkan ke `admin-queue.html`, dan mahasiswa tidak bisa membuka halaman admin.
5. Tombol Keluar selalu kembali ke `index.html`.

## Struktur folder

```
├── *.html                 # 15 halaman, satu file per halaman sitemap
├── assets/
│   ├── css/style.css      # token desain + tampilan semua komponen
│   ├── img/favicon.svg
│   └── js/
│       ├── api.js         # lapisan data + data referensi (fakultas, kategori, gender)
│       ├── app.js         # penjaga akses, navbar, komponen (catatan, cap, avatar, ikon), gerak
│       └── pages/*.js     # logika per halaman
├── docs/screenshots/      # <nama-file>-<lebar>.png untuk lebar 375, 768, dan 1280 px
└── tests/
    ├── api-flow.test.js   # alur lengkap: registrasi → KTM → approve → kampanye → … → Diambil
    ├── referensi.test.js  # daftar fakultas (17 entri, satu sumber) + kategori multi-pilih
    ├── links.test.js      # semua href/src lokal menunjuk ke file yang ada
    └── browser.test.js    # Chrome headless: akses, console, overflow, keyboard, gerak, screenshot
```

Komponen tampilan yang dipakai banyak halaman ada di `App` (`assets/js/app.js`):

| Fungsi | Kegunaan |
|---|---|
| `App.noteHTML(kampanye, opsi)` | Catatan kampanye. Ukuran mengikuti panjang deskripsi, sedangkan warna dan kemiringan diturunkan dari pembuat, sehingga pratinjau di Pasang kampanye sama persis dengan di papan. |
| `App.stampHTML()`, `App.stampIn(cap, kartu)` | Cap "Diambil" dan animasi menempelnya. |
| `App.avatar(id, ukuran)` | Avatar geometris (susunan 2×2 bentuk) yang dibuat dari ID anonim, bukan inisial. |
| `App.icon(nama)` | Ikon SVG inline dengan garis 1,5 px. |
| `App.tags(kategori)` | Tag kategori berwarna kuning. |
| `App.pinBoard(elemen)`, `App.drawPath(path)` | Animasi tempel catatan dan animasi menggambar garis. Keduanya tidak berjalan jika pengguna meminta gerak dikurangi. |

Menjalankan semua tes (butuh Node 22+; tes browser juga butuh Google Chrome dan internet):

```bash
node tests/api-flow.test.js
node tests/referensi.test.js
node tests/links.test.js
node tests/browser.test.js   # sekaligus memperbarui docs/screenshots/
```

Jika Chrome tidak berada di lokasi bawaan Windows, atur lokasinya lewat variabel `CHROME_PATH`. Jika sebuah screenshot sedang dibuka di program lain, tes mencoba menyimpannya lagi beberapa kali, lalu melaporkannya sebagai gagal tanpa menghentikan tes lain.

### Perubahan pada tes karena desain baru

- **Selector tag kategori** berubah dari `.badge.rounded-pill` menjadi `.tag`, di Profil Partner dan di kartu hasil pencarian.
- **Pesan admin di `auth.html`** sekarang berbunyi "Login admin". Tes mencocokkannya tanpa membedakan huruf besar dan kecil.
- **Pemeriksaan baru:**
  - Catatan di papan ditempel dengan animasi, lalu terlihat penuh.
  - Catatan yang Diambil memakai cap.
  - Connect menggambar garis penghubung.
  - Pemilik kampanye melihat garis ke setiap kartu respons.
  - Terima mengubah kartu menjadi "Terhubung" dengan tanda centang.
  - Deal menempelkan cap dengan animasi.
  - Dengan `prefers-reduced-motion: reduce`, tidak ada animasi dan cap tetap tampil.
- **Screenshot Notifikasi** kini diambil sebagai Citra, agar linimasa permintaan terlihat.

## Data referensi (fakultas, kategori, gender)

Satu-satunya sumber daftar ini adalah `Api.FAKULTAS`, `Api.KATEGORI`, dan `Api.GENDER` di `assets/js/api.js`. Form profil, filter pencarian, dan validasi `submitProfile` semuanya memakai daftar yang sama, sehingga daftar fakultas cukup diubah di satu tempat.

- **Fakultas** berisi **17 entri** dengan nama terbaru UB. Beberapa sumber menyebut UB punya 18 fakultas, kemungkinan karena Sekolah Pascasarjana ikut dihitung. Sekolah Pascasarjana tidak dimasukkan ke daftar ini.
- **Kategori** bersifat multi-pilih. Profil menyimpannya sebagai array, misalnya `["Interview", "Lomba"]`, dan wajib berisi minimal satu. Filter pencarian mencocokkan profil jika kategori yang dipilih termasuk dalam array tersebut. Pilihan "Semua" menampilkan semua profil.
- Saat backend siap, daftar ini bisa disajikan dari server (misalnya `GET /api/referensi`). Halaman tidak perlu diubah selama nama properti `Api` tetap sama.

## Menyambungkan ke backend

Halaman **tidak pernah** mengakses `localStorage` secara langsung. Semua data diambil melalui objek global `Api`, dan setiap fungsinya mengembalikan `Promise`. Untuk berpindah ke backend, cukup ganti **isi** setiap fungsi di `api.js` dengan `fetch()`. Nama fungsi, parameter, dan bentuk data yang dikembalikan harus tetap sama.

Contoh:

```js
// Sebelum (mock)
listCampaigns: function () {
  return respond(function () { /* ...baca localStorage... */ });
},

// Sesudah (backend)
listCampaigns: function () {
  return request('GET', '/api/campaigns');
},
```

Buat juga satu fungsi bantu `request()` agar penanganan error tetap sama. Pesan error dari server harus dilempar sebagai `Error(message)`, karena halaman menampilkan `err.message` kepada pengguna. Kode error tertentu (misalnya `ADMIN_ACCOUNT` saat akun admin mencoba masuk di `auth.html`) dikirim lewat `err.code`.

```js
function request(method, url, body) {
  return fetch(url, {
    method: method,
    credentials: 'include',               // sesi berbasis cookie
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) {
        var err = new Error(data.message || 'Permintaan gagal. Coba lagi.');
        err.code = data.code;
        throw err;
      }
      return data;
    });
  });
}
```

Usulan pemetaan endpoint REST:

| Fungsi `Api` | Endpoint |
|---|---|
| `me()` | `GET /api/me` (mengembalikan `null` jika belum login) |
| `register({email,password})` | `POST /api/auth/register` |
| `registerAdmin({email,password})` | `POST /api/auth/register-admin` |
| `login({email,password,role})` | `POST /api/auth/login` |
| `logout()` | `POST /api/auth/logout` |
| `getMyProfile()` | `GET /api/profile` |
| `submitProfile(data, ktmFilename)` | `PUT /api/profile`. Berkas KTM sebaiknya diunggah sebagai `multipart/form-data`, lihat catatan di bawah. |
| `listCampaigns()` / `getCampaign(id)` | `GET /api/campaigns`, `GET /api/campaigns/:id` |
| `createCampaign({deskripsi,benefit})` | `POST /api/campaigns` |
| `connect({type,refId})` | `POST /api/connections` |
| `listIncomingConnections()` | `GET /api/connections/incoming` |
| `respondConnection(id, accept)` | `POST /api/connections/:id/respond` |
| `searchProfiles({kategori,fakultas,gender})` | `GET /api/profiles?kategori=&fakultas=&gender=` |
| `getPartner(userId)` | `GET /api/profiles/:userId` |
| `listConversations()` / `getConversation(id)` | `GET /api/conversations`, `GET /api/conversations/:id` |
| `sendMessage(id, text)` | `POST /api/conversations/:id/messages` |
| `markDeal(id)` | `POST /api/conversations/:id/deal` |
| `listNotifications()` / `markAllRead()` / `unreadCount()` | `GET /api/notifications`, `POST /api/notifications/read-all`, `GET /api/notifications/unread-count` |
| `adminQueue()` / `adminGetUser(id)` / `adminReview(id,status)` | `GET /api/admin/queue`, `GET /api/admin/users/:id`, `POST /api/admin/users/:id/review` |

Catatan untuk backend:
- **Validasi tetap wajib di server.** Validasi di halaman hanya membantu pengguna. Aturan yang perlu dipindahkan ke server sudah tertulis di `api.js`: hanya mahasiswa Disetujui yang bisa memakai fitur, tidak bisa connect ke kampanye sendiri, tidak boleh ada connect ganda, Deal menutup semua obrolan untuk target yang sama, dan permintaan yang masih menunggu otomatis ditolak.
- **Unggah KTM.** Versi mock hanya menyimpan **nama berkas**, sehingga admin melihat kartu kosong berlabel "Belum ada gambar" beserta nama berkasnya. Saat backend siap, `submitProfile` cukup mengirim berkasnya (misalnya mengambil `File` dari `#ktm-file`), dan `adminGetUser` mengembalikan URL gambar untuk ditampilkan di `.ktm-card`.
- **Signup admin** saat ini terbuka untuk siapa saja, sesuai laporan ("Signup / Login Admin"). Di backend, signup admin perlu dibatasi, misalnya dengan kode undangan.
- **Obrolan** memeriksa pesan baru setiap 4 detik (polling). Di backend, polling ini bisa diganti dengan WebSocket tanpa mengubah halaman lain.
- `Api._resetDemo()` hanya dipakai untuk pengembangan dan bukan bagian dari kontrak backend.

## Asumsi dan keputusan desain

Bagian laporan yang ambigu diselesaikan dengan interpretasi paling sederhana:

1. **Gender dan kategori di profil.** Laporan memakai keduanya sebagai filter pencarian (3.2.1 dan 3.2.3), tetapi tidak mencantumkannya di form profil (1.2). Keduanya ditambahkan ke Profil Anonim. Kategori berupa checkbox multi-pilih yang tampil sebagai tag kuning ("Bersedia menjadi partner untuk"). Di Profil Partner dan kartu hasil pencarian, setiap kategori tampil sebagai tag terpisah.
2. **Status awal "Belum Lengkap".** Akun yang baru terdaftar tetapi belum mengirim profil dan KTM diberi status ini. Statusnya berubah menjadi **Menunggu** setelah tombol "Kirim untuk verifikasi" ditekan. Akses untuk status ini sama dengan Menunggu dan Ditolak.
3. **Tombol "Unggah ulang KTM"** di halaman Status mengarah ke bagian KTM di `profile.html#ktm`. Jika status sebelumnya Ditolak, berkas baru wajib diunggah.
4. **Respons Connect.** Permintaan Connect bisa diterima atau ditolak dari halaman Detail Kampanye (khusus pemilik) maupun dari halaman Notifikasi (untuk semua kampanye dan profil). Obrolan baru terbuka setelah permintaan **diterima**.
5. **Status "Diambil" pada profil.** Untuk alur Cari Sendiri, Deal menandai **profil yang dicari** sebagai Diambil (sesuai HTA 3.7). Profil tersebut tetap muncul di hasil pencarian dengan cap Diambil, tetapi tombol Connect-nya nonaktif.
6. **Siapa yang bisa menekan Deal.** Kedua pihak di obrolan bisa menekan Deal, dengan konfirmasi lewat modal. Setelah Deal, semua obrolan untuk kampanye atau profil yang sama ditutup.
7. **Daftar fakultas berisi 17 entri** dengan nama terbaru UB (lihat bagian "Data referensi"). Sekolah Pascasarjana tidak dihitung sebagai fakultas.
8. **Pintu masuk admin hanya `admin-login.html`**, sesuai sitemap 7.1–7.2.
   - `auth.html` khusus untuk mahasiswa dan menyediakan tautan **"Login admin"**.
   - Jika akun admin mencoba masuk lewat `auth.html`, login ditolak (pengguna tidak ikut masuk). Halaman menampilkan pesan "Ini akun admin. Masuk lewat halaman Login admin." beserta tautannya, tanpa redirect otomatis.
   - Laporan 4.2 menulis "Admin menuju 7.2" pada baris halaman 2.1. Ini ditafsirkan sebagai *diarahkan* ke halaman Login Admin, bukan *login* dari halaman mahasiswa. Dengan begitu, jalur admin tetap terpisah (aturan navigasi no. 4).
9. **Menu akun.** Untuk mahasiswa yang sudah disetujui, **Profil, Status verifikasi, dan Keluar** dikelompokkan dalam menu akun di navbar agar navbar desktop tidak terlalu padat. Ketiganya tetap bisa dicapai dari halaman mana pun, dengan mouse maupun keyboard.
10. **Warna dan kemiringan catatan** diturunkan dari nama anonim pembuat dan ukuran catatan. Akibatnya, dua kampanye dari pembuat yang sama dengan panjang deskripsi serupa akan tampil dengan warna dan kemiringan yang sama. Cara ini dipilih agar pratinjau di Pasang kampanye bisa sama persis dengan hasil di papan, sebelum kampanye punya ID.

## Verifikasi yang sudah dilakukan

- `node --check` lulus untuk ke-21 file JavaScript (17 file aplikasi dan 4 file tes).
- `node tests/links.test.js`: semua `href` dan `src` lokal (134 referensi) menunjuk ke file yang ada.
- `node tests/api-flow.test.js`: 42 pemeriksaan alur lulus. Alur yang diuji: registrasi, KTM, Reject, unggah ulang, Approve, kampanye, connect, terima, chat, Deal, Diambil, filter pencarian, connect profil, dan aturan akses.
- `node tests/referensi.test.js`: 81 pemeriksaan lulus.
  - Daftar fakultas berisi tepat 17 entri, tanpa nama lama dan tanpa duplikat. Daftarnya hanya ada di `api.js`.
  - Kategori multi-pilih: array kosong, nilai asing, dan duplikat ditangani dengan benar.
  - Filter `includes` dan pilihan "Semua" bekerja.
  - Akun admin ditolak di jalur mahasiswa.
- `node tests/browser.test.js` (Chrome headless): 238 pemeriksaan lulus.
  - Redirect untuk 4 peran (tamu, mahasiswa disetujui, mahasiswa menunggu, admin) di ke-15 halaman.
  - Tidak ada error console dan tidak ada overflow horizontal di 375, 768, dan 1280 px.
  - Bootstrap dari CDN termuat (SRI valid).
  - Form profil menampilkan 17 fakultas dan 4 pilihan kategori. Kategori tampil sebagai tag terpisah di Profil Partner dan kartu hasil pencarian.
  - Menu akun bisa dipakai dengan keyboard (Tab, Enter, panah, Esc). Di mobile, menu dibuka lewat toggler dan semua item bisa diklik.
  - Login admin lewat `auth.html` ditolak dengan pesan dan tautan ke Login admin.
  - Validasi form tanpa `alert()`, modal Deal, status Diambil, Setujui oleh admin, dan tombol Keluar berjalan.
  - Gerak: catatan ditempel, garis Connect, kartu Terhubung, dan cap Deal. Dengan `prefers-reduced-motion`, tidak ada animasi dan status akhir tetap tampil.
- Screenshot untuk laporan ada di `docs/screenshots/` (45 berkas: 15 halaman × 3 lebar). Akun demo yang dipakai:
  - **Andi:** sebagian besar halaman mahasiswa.
  - **Citra:** Detail Kampanye dan Notifikasi, agar daftar Respons/Connect terlihat.
  - **Dewi:** Status Verifikasi (Menunggu).
  - **Admin:** halaman admin.
  - Halaman Cari partner diambil dengan filter "Semua" yang sudah diterapkan.
