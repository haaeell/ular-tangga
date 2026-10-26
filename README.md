# Love & Ladder 21+

Permainan dua pemain satu perangkat. Buka melalui server HTTP lokal:

Satu tema malam berdua 21+. Semua 36 petak memiliki kategori kartu; kartu pembuka muncul di petak 1, kartu penutup sebelum hasil di petak 36. Kartu dapat diganti atau dilewati tanpa penalti.

```sh
python3 -m http.server 8000
```

Buka `http://localhost:8000`. Koneksi internet diperlukan untuk Tailwind CDN. Tidak ada akun atau backend; data tersimpan di `localStorage` browser saat ini (`love_ladder_v1`). Browser lain atau penghapusan data situs tidak mempertahankan sesi.

Periksa logika permainan:

```sh
node engine.test.mjs
```
