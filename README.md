# SINYAL — Zonautara.com

Asisten investigasi lingkungan untuk redaksi kecil. Prototipe Journalism AI Hackathon 2026.

## Alur jurnalistik
1. Reporter/editor memilih laporan nyata dari Pantau Iklim.
2. AI menyusun rekomendasi prioritas pemeriksaan, bukan kesimpulan penyebab.
3. SINYAL menampilkan **rencana** analisis Sentinel-2 multi-tanggal (Google Earth Engine belum dijalankan dalam MVP).
4. Editor menyetujui atau menunda penugasan.
5. Reporter membuka lokasi dan rute Google Maps menggunakan koordinat laporan warga.

## Kode
- `public/index.html`: UI dan mode simulasi yang diberi label jelas.
- `worker.js`: API `/api/status` dan `/api/analyze`, menggunakan binding Cloudflare Workers AI.
- `wrangler.toml`: konfigurasi deployment Cloudflare Worker.

Laporan bersumber dari [Pantau Iklim Sulut](https://docs.google.com/spreadsheets/d/130HHNINgR23YNK9T6u0T8_zot2aHzz5kKyuE2DvZ7VQ/edit). Koordinat adalah titik laporan, **bukan** batas sawah, bukti hulu–hilir, ataupun lokasi pintu air.

## Deployment otomatis (direkomendasikan)
1. Buka Cloudflare Dashboard → Workers & Pages → Create application.
2. Pilih GitHub, otorisasi, dan pilih repository `ronnybuol/sinyal`.
3. Root directory: `/`, branch produksi: `main`.
4. Build command: kosong (tidak memerlukan bundling frontend).
5. Deploy command: `npx wrangler deploy`.
6. Nama Worker harus `sinyal` sesuai `wrangler.toml`.
7. Klik Save and Deploy, lalu uji `/api/status` dan satu pertanyaan reporter.

Setelah terhubung, setiap commit ke `main` akan memicu build/deploy otomatis melalui Cloudflare Workers Builds. Sebelum koneksi dibuat, commit GitHub **tidak** otomatis terbit di Cloudflare.

Alternatif deployment terminal: `npx wrangler deploy`.

## Batas keamanan dan keterbatasan
- Belum ada analisis Sentinel-2 langsung; AI hanya menyarankan rencana pemeriksaan.
- Tidak boleh menyebut penurunan NDVI sebagai bukti gagal panen, kekeringan, atau kesalahan tata kelola.
- Keputusan liputan ada pada editor; laporan warga perlu diverifikasi di lapangan.
- `/api/analyze` masih endpoint demo tanpa autentikasi/rate limit khusus. Sebelum membuka layanan secara luas, pasang Cloudflare Access, WAF/rate limiting, atau pembatasan akses lain.
- Jangan menyimpan API token atau data pribadi pelapor di GitHub.
- Publikasi di `zonautara.com/sinyal/` membutuhkan pengaturan integrasi WordPress / domain setelah Worker aktif.
