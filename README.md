# Ular Tangga Cinta 21+

Permainan dua pemain satu perangkat. Buka melalui server HTTP lokal:

Satu tema malam berdua 21+. Semua 36 petak memiliki kategori kartu; kartu pembuka muncul di petak 1, kartu penutup sebelum hasil di petak 36. Kartu dapat diganti atau dilewati tanpa penalti.

Musik latar adalah komposisi piano orisinal di `assets/romantic-theme.wav`; efek suara tetap dibuat langsung oleh browser. Keduanya aktif secara bawaan untuk sesi baru, dapat dimatikan secara terpisah saat bermain atau dijeda, dan musik berhenti saat game dijeda atau tab disembunyikan. Saat pertama kali bermain, panduan singkat menawarkan mode layar penuh. Logo ada di `assets/logo.svg` dan dipakai juga untuk favicon serta ikon aplikasi.

```sh
python3 -m http.server 8000
```

Buka `http://localhost:8000`. Koneksi internet diperlukan untuk Tailwind CDN. Tidak ada akun atau backend; data tersimpan di `localStorage` browser saat ini (`love_ladder_v1`). Browser lain atau penghapusan data situs tidak mempertahankan sesi.

Kunci penyimpanan lama tetap dipakai agar sesi yang sudah ada tidak hilang setelah perubahan nama. Untuk membuat ulang musik latar, jalankan `python3 scripts/generate_romantic_theme.py assets/romantic-theme.wav` (memerlukan NumPy).

Periksa logika permainan:

```sh
node engine.test.mjs
```
