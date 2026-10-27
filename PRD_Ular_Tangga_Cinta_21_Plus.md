# PRD — Ular Tangga Cinta 21+

**Versi:** 1.0 (pra-coding)  
**Platform:** web responsif, satu perangkat, dua pemain  
**Stack:** HTML5, Tailwind CSS, JavaScript vanilla (ES Modules), LocalStorage  
**Status:** spesifikasi MVP siap implementasi

## 1. Ringkasan produk

**Ular Tangga Cinta 21+** adalah permainan ular tangga privat untuk pasangan suami istri dewasa, dimainkan bergantian dari satu HP/laptop. Papan 6×6 berisi 36 kotak. Pemain melempar dadu, menggerakkan pion, menemukan tangga/ular, dan membuka kartu berisi tantangan romantis, flirty, intim non-eksplisit, atau kejutan.

**Konfigurasi awal:** pemain `Suami` dan `Istri`, mode `Campuran`, 36 kotak, kartu custom **aktif**.

**Prinsip:** sukarela dan menyenangkan; kedua pemain bebas mengubah mode, mengganti/melewati kartu, berhenti bermain kapan saja, tanpa hukuman maupun pengurangan poin. Tidak memerlukan akun, backend, database server, atau koneksi internet jika versi produksi menyertakan seluruh aset secara lokal.

## 2. Tujuan, cakupan, dan non-tujuan MVP

**Tujuan**
- Menyediakan aktivitas date night berdua dengan alur yang sederhana dan tidak membosankan.
- Menghasilkan kejutan dari kombinasi dadu, ular, tangga, dan kartu acak.
- Memungkinkan pasangan menambahkan tantangan pribadi dengan mudah.
- Menyimpan permainan secara lokal agar bisa dilanjutkan setelah refresh.

**Cakupan MVP**
- Satu layar/perangkat dengan 2 pion bergantian.
- Onboarding/konfirmasi kedua pemain adalah orang dewasa dan setuju bermain.
- Setup nama, mode, suara/animasi, hadiah akhir (opsional), aktif/nonaktif kartu custom.
- Papan 6×6, dadu 1–6, animasi, ular dan tangga, progress pemain.
- Empat kategori kartu dan koleksi default 24 kartu.
- Kartu custom: tambah, ubah, hapus, aktif/nonaktif.
- Tombol **Selesai**, **Ganti Kartu**, dan **Lewati** pada setiap kartu tanpa penalti.
- Love Points bersama (bukan berdasarkan berhasil/tidaknya tindakan intim), riwayat ringkas, pause, reset, lanjutkan permainan.
- Layar selesai beserta pemenang dan opsi main lagi.

**Di luar MVP:** multiplayer real-time dua HP, login, cloud sync, leaderboard publik, monetisasi, analitik pihak ketiga, pengunggahan foto, dan chat.

## 3. Gaya visual dan UX

- Tema: `Romantic Night`, elegan, premium, hangat, bukan vulgar.
- Warna: burgundy `#5B223D`, rose `#D76D8B`, blush `#F7E5EB`, champagne `#EAD8BF`, teks gelap `#30212B`.
- Papan 6×6 dominan; pion Suami dan Istri berbeda warna/ikon, jangan hanya warna sebagai penanda.
- Kartu berupa modal beranimasi flip (memperhatikan `prefers-reduced-motion`).
- Mobile-first, ukuran target sentuh minimal 44×44 px, tombol dadu dan ganti giliran mudah dijangkau.
- Desktop: papan di kiri, info giliran/kartu/log di kanan. Mobile: papan penuh, panel ringkas dan tombol dadu sticky di bawah (tidak menutup konten).
- Musik dan efek suara opsional, nonaktif secara default; tidak auto-play sebelum interaksi.
- Semua pesan game dalam bahasa Indonesia santai dan hangat.

## 4. Alur layar

```text
Welcome + konfirmasi orang dewasa dan persetujuan bersama
  └── Setup (Suami / Istri; Campuran; 36 kotak; custom aktif)
       ├── Cara Bermain
       ├── Kelola Kartu Custom
       └── Mulai Game
            └── Layar Board
                ├── Lempar Dadu → animasi pion → efek ular/tangga
                ├── Bila kotak kartu → modal kartu
                │    ├── Selesai → giliran berikut
                │    ├── Ganti Kartu → ambil kartu lain dalam kategori sama
                │    └── Lewati → giliran berikut, tanpa penalti
                ├── Bila kotak netral → giliran berikut
                ├── Pause → lanjut / pengaturan / keluar
                └── Kotak 36 → layar hasil → main lagi / kembali setup
```

**Layar 1 — Welcome:** judul, ilustrasi minimalis, keterangan permainan privat, checkbox persetujuan kedua pihak, tombol Masuk. Persetujuan dapat ditarik sewaktu-waktu.

**Layar 2 — Setup:** edit nama, mode Campuran, 36 kotak tetap untuk MVP, toggle suara, preferensi animasi, kartu custom aktif, hadiah akhir opsional, tombol Mulai. Di sini ada akses ke editor kartu dan aturan.

**Layar 3 — Board:** topbar pemain aktif, posisi, Love Points bersama, tombol jeda; papan dengan koordinat ular/tangga; tombol utama Lempar Dadu; kotak informasi peristiwa terakhir; pergantian giliran otomatis setelah kartu ditutup.

**Layar 4 — Card Modal:** warna/kategori kartu, judul, deskripsi, label giliran, aksi Selesai / Ganti Kartu / Lewati. Fokus keyboard ditahan di modal saat terbuka. Semua aksi tersedia tanpa timer paksa.

**Layar 5 — Kelola Kartu:** filter kategori, daftar kartu, tombol tambah, edit, hapus (konfirmasi), toggle aktif. Simpan otomatis lokal. Kartu bawaan dapat dinonaktifkan; kartu custom bisa dihapus.

**Layar 6 — Hasil:** pemenang adalah pemain pertama yang mencapai kotak 36, ringkasan giliran, Love Points bersama, hadiah yang disepakati, tombol Main Lagi / Ubah Pengaturan.

## 5. Aturan permainan final

1. Pemain Suami dan Istri mulai dari kotak **1**. Suami mendapatkan giliran pertama; giliran berikutnya bergantian.
2. Dadu menghasilkan bilangan bulat acak **1–6**. Pemain hanya boleh melempar saat fase `WAITING_ROLL` dan milik gilirannya.
3. Pion bergerak sesuai angka dadu. Jika angka melampaui kotak 36, pion berhenti tepat di **36** (tidak harus angka pas), sehingga durasi tidak terlalu panjang.
4. Bila pion berhenti di **pangkal tangga**, segera berpindah ke puncak tangga. Bila berhenti di **kepala ular**, langsung turun ke ekornya.
5. Hanya **satu** perpindahan ular/tangga per lemparan (tidak ada efek berantai). Animasi selesai sebelum kartu muncul.
6. Efek kartu ditentukan berdasarkan **kotak terakhir setelah ular/tangga**. Maksimum satu kartu per giliran.
7. Kartu bisa diselesaikan, diganti, atau dilewati. **Tidak ada penalti, kehilangan poin, atau kewajiban menjelaskan alasan** jika melewati kartu.
8. Setelah kartu ditutup (atau jika berhenti di kotak netral), giliran berpindah ke pemain lain.
9. Kotak 36 langsung mengakhiri permainan. Pemenang adalah pemain pertama yang sampai, terlepas dari Love Points.
10. Love Points adalah **skor bersama**: bertambah otomatis saat mendarat di kotak kartu (+1 untuk Romantic/Flirty/Intimate, +2 untuk Surprise), **bukan** karena menyetujui atau menyelesaikan tindakan. Poin tidak berkurang jika kartu dilewati.
11. Layar pause memungkinkan lanjut, mengubah preferensi yang tidak merusak sesi, atau mengakhiri game dengan konfirmasi.
12. Pemain boleh berhenti kapan saja; tantangan hanya dilakukan bila keduanya nyaman dan setuju. Tidak ada konsekuensi dalam game untuk penolakan.

## 6. Konfigurasi papan 36 kotak

Nomor kotak disusun zig-zag: bawah kiri `1`, bawah kanan `6`, baris di atasnya kanan ke kiri `7–12`, dan seterusnya hingga `36` di bagian atas.

**Tangga**

| Pangkal | Ujung |
|---:|---:|
| 3 | 12 |
| 8 | 17 |
| 20 | 30 |

**Ular**

| Kepala | Ekor |
|---:|---:|
| 19 | 7 |
| 27 | 13 |
| 32 | 21 |

**Kotak kartu (tidak tumpang tindih dengan pangkal/kepala ular/tangga):**

| Jenis | Nomor kotak |
|---|---|
| Romantic | 4, 9, 16, 23, 29, 34 |
| Flirty | 5, 11, 18, 25, 31 |
| Intimate | 10, 15, 22, 28, 33 |
| Surprise | 6, 14, 24, 35 |
| Start | 1 |
| Finish | 36 |
| Netral | Nomor lain |

Pion, ikon kategori, ular, dan tangga ditampilkan jelas. Jalur ular/tangga digambar dengan lapisan SVG absolut di atas papan dan dihitung ulang saat ukuran papan berubah.

## 7. Jenis kartu dan isi default

Semua kartu berbentuk ajakan sukarela, bukan kewajiban. Mode `Campuran` menampilkan seluruh kategori; nanti kategori dapat dinonaktifkan pada setup. Saat kategori nonaktif, kotak tersebut memakai kartu Romantic yang tersedia atau menjadi netral jika tidak ada kartu aktif.

### 7.1 Romantic (6)
1. **Kenangan Pertama** — Ceritakan momen pertama yang membuatmu merasa dekat dengannya.
2. **Tiga Hal Kecil** — Sebutkan tiga kebiasaan pasangan yang kamu sukai.
3. **Tatap Mata** — Jika sama-sama nyaman, saling tatap selama 20 detik lalu tersenyum.
4. **Terima Kasih** — Katakan satu hal yang ingin kamu apresiasi hari ini.
5. **Date Impian** — Rancang satu kencan sederhana yang ingin dilakukan bersama.
6. **Pelukan Hangat** — Tawarkan pelukan hangat atau pilih gestur kasih sayang lain yang nyaman.

### 7.2 Flirty (6)
1. **Rayuan Spontan** — Ciptakan satu gombalan baru untuk pasangan.
2. **Bisikan Manis** — Bisikkan kalimat romantis, jika pasangan bersedia.
3. **Pilihan Ciuman** — Tawarkan ciuman di kening atau pipi, atau ganti dengan pelukan.
4. **Pujian Detail** — Sebutkan bagian dari penampilan pasangan yang menurutmu menarik dengan sopan.
5. **Ajak Berdansa** — Undang pasangan berdansa singkat atau bergoyang mengikuti lagu favorit.
6. **Kode Rahasia** — Ciptakan kode kata yang artinya “aku ingin dipeluk”.

### 7.3 Intimate (6, tetap non-eksplisit)
1. **Zona Nyaman** — Berbagi hal yang membuat kalian merasa aman dan dekat.
2. **Quality Time** — Pilih duduk berdampingan atau berpelukan selama satu menit jika sepakat.
3. **Pijatan Relaksasi** — Tawarkan pijatan bahu singkat; pasangan bebas memilih atau menolak.
4. **Bahasa Sayang** — Ceritakan sentuhan afeksi non-seksual yang paling disukai.
5. **Momen Kita** — Tentukan suasana malam romantis ideal menurut masing-masing.
6. **Saling Mendengarkan** — Sampaikan satu keinginan tentang kedekatan emosional, lalu dengarkan tanpa menghakimi.

### 7.4 Surprise (6)
1. **Pertanyaan Misteri** — Masing-masing sebutkan satu hal baru yang ingin dicoba bersama sebagai aktivitas kencan.
2. **Tukar Cerita** — Bergantian cerita tentang hal paling lucu minggu ini.
3. **Surat Mini** — Tulis pesan manis satu kalimat untuk pasangan.
4. **Kejutan Baik** — Buat janji aksi kecil yang realistis untuk menyenangkan pasangan besok.
5. **Foto Kenangan** — Pilih satu foto lama lalu ceritakan memori di baliknya (opsional, tidak diunggah ke aplikasi).
6. **Pilihan Bersama** — Pilih satu: putar lagu cinta, membuat minuman hangat, atau berpelukan jika nyaman.

**Aturan deck:** kumpulkan kartu aktif per kategori. Gunakan shuffle Fisher–Yates untuk membuat antrean acak. Keluarkan satu kartu per undian. Jika antrean habis, acak kembali; hindari mengulang kartu yang baru muncul bila ada alternatif. `Ganti Kartu` tidak dibatasi, tidak mengurangi poin. Jika kategori kosong, tawarkan kartu dari Romantic atau tampilkan informasi bahwa kotak dapat dilewati. Kartu custom masuk dalam antrean sesuai kategori.

## 8. Editor kartu custom

**Field:** `id` (UUID), `category` (`romantic | flirty | intimate | surprise`), `title` (1–60 karakter), `description` (1–300 karakter), `isActive` (boolean), `isCustom` (boolean), `createdAt`, `updatedAt`.

**Fungsi:** tambah, edit, hapus, aktif/nonaktif, cari berdasarkan judul/kategori, reset kartu bawaan; nomor kotak **tidak** terikat ke satu kartu agar permainan selalu acak. Beri penjelasan bahwa semua teks custom hanya disimpan di browser/perangkat saat ini.

**Validasi:** trim spasi, batasi panjang, judul wajib, deskripsi wajib, kategori terdaftar; render teks custom dengan `textContent`, jangan memakai `innerHTML` langsung untuk mencegah XSS. Sediakan konfirmasi sebelum menghapus.

## 9. Game engine / state machine

### 9.1 Struktur state

```js
const initialState = {
  version: 1,
  phase: 'SETUP', // SETUP | WAITING_ROLL | ROLLING | MOVING | SHOW_CARD | PAUSED | FINISHED
  players: [
    { id: 'husband', name: 'Suami', position: 1 },
    { id: 'wife', name: 'Istri', position: 1 },
  ],
  activePlayerIndex: 0,
  lastDice: null,
  turnCount: 0,
  pendingCard: null,
  lovePoints: 0,
  winnerId: null,
  history: [],
  deckQueues: { romantic: [], flirty: [], intimate: [], surprise: [] },
  settings: { mode: 'mixed', boardSize: 36, customCardsEnabled: true, sound: false, reducedMotion: false },
  updatedAt: null,
};
```

### 9.2 Transisi utama

```text
SETUP -- START --> WAITING_ROLL
WAITING_ROLL -- ROLL --> ROLLING
ROLLING -- dice computed --> MOVING
MOVING -- finish reached --> FINISHED
MOVING -- card tile --> SHOW_CARD
MOVING -- neutral tile --> WAITING_ROLL (switch player)
SHOW_CARD -- DONE | SKIP --> WAITING_ROLL (switch player)
SHOW_CARD -- REPLACE --> SHOW_CARD (new card)
WAITING_ROLL / SHOW_CARD -- PAUSE --> PAUSED
PAUSED -- RESUME --> previous safe phase
FINISHED -- RESTART --> WAITING_ROLL (reset positions/score/decks)
```

### 9.3 Algoritma satu lemparan

```text
1. Pastikan phase == WAITING_ROLL dan tidak ada animasi/aksi berjalan.
2. Set phase = ROLLING; disable tombol.
3. Generate integer 1..6 (hasil ditentukan sebelum animasi dadu).
4. Tentukan landing = min(36, currentPosition + dice).
5. Jika landing ada di snakes/ladders, finalPosition = map[landing]; selain itu = landing.
6. Set phase = MOVING; jalankan animasi pion langkah demi langkah dan transisi ular/tangga jika ada.
7. Tetapkan posisi akhir (tanpa menerapkan perpindahan kedua).
8. Jika finalPosition == 36: phase FINISHED; winnerId = currentPlayer; tampilkan hasil.
9. Jika finalPosition berupa kategori kartu: tambah Love Points untuk landing kategori, draw kartu aktif, phase SHOW_CARD. Jika kartu kosong, pindah giliran.
10. Jika netral: pindah giliran.
11. Simpan snapshot state yang sudah stabil ke LocalStorage.
```

**Catatan reliabilitas:** selama animasi, game engine menghitung hasil secara deterministik lebih dulu tetapi simpan snapshot hanya pada state stabil, agar refresh di tengah animasi kembali ke state valid. Semua tombol dijaga agar tidak memproses dua lemparan sekaligus. Penghitung `turnCount` naik satu per lemparan, termasuk jika pemain mencapai finish.

## 10. Penyimpanan LocalStorage

Simpan di satu key: `love_ladder_v1`.

```json
{
  "version": 1,
  "settings": {
    "mode": "mixed",
    "boardSize": 36,
    "customCardsEnabled": true,
    "sound": false
  },
  "customCards": [],
  "gameState": {
    "phase": "WAITING_ROLL",
    "players": [
      { "id": "husband", "name": "Suami", "position": 1 },
      { "id": "wife", "name": "Istri", "position": 1 }
    ],
    "activePlayerIndex": 0,
    "lastDice": null,
    "turnCount": 0,
    "lovePoints": 0,
    "winnerId": null,
    "pendingCard": null,
    "history": [],
    "deckQueues": { "romantic": [], "flirty": [], "intimate": [], "surprise": [] }
  }
}
```

**Simpan pada:** Mulai Game, selesai perpindahan, pembukaan/penggantian/penutupan kartu pada state stabil, update kartu custom, setting, pause, restart. **Buka aplikasi:** jika ada sesi aktif, tampilkan pilihan `Lanjutkan` atau `Permainan Baru`.

**Privasi:** LocalStorage tidak dienkripsi dan dapat dilihat siapa pun yang memakai browser/profil/perangkat yang sama. Tidak ada server dan tidak ada upload. Berikan fitur `Hapus Semua Data` dengan konfirmasi. Untuk versi produksi yang membutuhkan privasi lebih tinggi, evaluasi enkripsi lokal dengan passphrase atau hindari konten sensitif.

## 11. Struktur folder project

```text
ular-tangga-cinta/
├── index.html                 # Semua screen / root UI
├── manifest.webmanifest       # Opsional: instalasi PWA
├── sw.js                      # Opsional: cache offline setelah build
├── assets/
│   ├── icons/
│   └── sounds/
├── css/
│   ├── input.css              # Tailwind source + komponen kecil
│   └── app.css                # Hasil build lokal untuk produksi
├── js/
│   ├── app.js                 # Bootstrap dan event handlers
│   ├── config.js              # Board 36 kotak, kategori, constants
│   ├── game-engine.js         # Pure logic, state transitions
│   ├── board.js               # Render board/pion/ular/tangga
│   ├── card-engine.js         # Deck, shuffle, undian, filter
│   ├── card-editor.js         # CRUD kartu custom
│   ├── storage.js             # Load/save, schema, reset
│   ├── ui.js                  # Screen, modal, toast, accessibility
│   └── utils.js               # Helpers (escape, id, random)
├── data/
│   └── default-cards.js       # 24 kartu awal
└── README.md                  # Cara jalankan, build, tes, deploy
```

**Tailwind dan offline:** CDN/browser build hanya untuk prototipe dan memerlukan internet. Untuk produksi, hasilkan `css/app.css` di komputer pengembang dan deploy sebagai file statis agar server/hosting cPanel tidak memerlukan Node.js yang terus berjalan. PWA offline bisa diaktifkan setelah aset lokal tersedia dan situs disajikan melalui HTTPS. ES Modules juga lebih baik dijalankan lewat server lokal saat development daripada langsung membuka `file://`.

## 12. Batas modul dan fungsi kunci

- `config.js`: `BOARD_SIZE`, `SNAKES`, `LADDERS`, `TILE_TYPES`, kategori dan pengaturan default.
- `game-engine.js`: `createGame(settings)`, `rollDice(state)`, `resolveLanding(position, dice)`, `advanceTurn(state)`, `resolveCard(state, action)`, `pauseGame(state)`, `restartGame(state)`.
- `board.js`: `renderBoard(state)`, `animateMove(from, landing, final)`, `renderLinks()`, `renderPlayers()`.
- `card-engine.js`: `getEligibleCards(category, settings, customs)`, `shuffleDeck(cards)`, `drawCard(category, deckState)`, `replaceCard(...)`.
- `card-editor.js`: `validateCard`, `createCard`, `updateCard`, `deleteCard`, `toggleCard`.
- `storage.js`: `loadAppData`, `saveAppData`, `migrateAppData`, `clearAppData`, `restoreSession`.
- `ui.js`: `showScreen`, `openCardModal`, `closeCardModal`, `showToast`, `updateScoreboard`.

**Prinsip:** aturan permainan berada di game engine sebagai fungsi murni; DOM dan animasi terpisah. Jika animasi gagal, posisi/logika tetap valid.

## 13. Pengujian penerimaan (manual)

| ID | Skenario | Ekspektasi |
|---|---|---|
| G01 | Mulai dari setup | Dua pion di kotak 1, Suami aktif, 0 poin |
| G02 | Suami lempar dadu | Nilai 1–6, hanya satu perpindahan, giliran terkunci selama animasi |
| G03 | Pion berhenti di kotak 3 | Naik ke 12, tidak menarik kartu untuk kotak 3 |
| G04 | Pion berhenti di kotak 19 | Turun ke 7, tidak memicu ular/tangga tambahan |
| G05 | Berhenti di kotak Romantic | Kartu Romantic muncul, Love Points +1 otomatis |
| G06 | Lewati kartu Intimate | Giliran berganti, poin tidak berkurang, tanpa konfirmasi bersalah |
| G07 | Ganti kartu | Jenis kategori sama, mengambil kartu berbeda jika tersedia |
| G08 | Tambah kartu custom | Muncul di deck kategori saat custom aktif |
| G09 | Matikan kartu custom | Kartu custom tidak diundi tanpa menghapus datanya |
| G10 | Refresh di tengah permainan | Sesi valid dipulihkan, pion/poin/giliran tidak rusak |
| G11 | Posisi 34, hasil dadu 5 | Menang di kotak 36 (overshoot clamp) |
| G12 | Klik lempar dua kali | Hanya satu aksi dadu yang dieksekusi |
| G13 | Semua kartu kategori dinonaktifkan | Tidak crash; fallback Romantic atau netral |
| G14 | Input custom berisi markup HTML | Ditampilkan sebagai teks, tidak dijalankan sebagai HTML |
| G15 | Hapus Semua Data | Semua data lokal dan sesi terhapus setelah konfirmasi |
| G16 | Mode reduced motion | Animasi dikurangi, gameplay tetap berfungsi |

## 14. Tahapan implementasi

**Tahap 1 — Fondasi UI:** tampilan welcome, setup, papan 6×6 responsif, tema Romantic Night, modal kartu dan hasil.

**Tahap 2 — Engine:** dadu, giliran, pion, ular/tangga, finish, state machine dan log.

**Tahap 3 — Kartu:** 24 kartu default, antrian acak non-berulang, ganti/lewati, Love Points bersama.

**Tahap 4 — Custom & penyimpanan:** CRUD kartu, LocalStorage, restore, pause/reset, fallback versi data.

**Tahap 5 — Polishing:** animasi, efek suara opsional, a11y, responsivitas berbagai layar.

**Tahap 6 — QA & deploy:** tes manual, compile Tailwind lokal, upload file statis ke hosting HTTPS, opsi PWA offline.

## 15. Definition of Done

MVP dianggap selesai bila dua pemain dapat memainkan sesi penuh dari kotak 1 sampai 36 pada satu perangkat tanpa akun; semua aturan ular/tangga bekerja benar; kartu bisa diganti/lewati tanpa penalti; editor custom berfungsi; refresh memulihkan state yang valid; tidak terjadi double roll; seluruh tampilan nyaman pada mobile/desktop; dan data game tetap privat di browser tanpa dikirim ke server.
