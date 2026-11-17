# Buku Saku Manajer — Landing Page

Landing page untuk **Buku Saku Manajer Edisi Kedua** (Armala · Human Plus Institute), dibangun dengan Next.js 16.
Produksi: https://bsm.humplus.com

## Isi & sumber materi

Semua copywriting dan foto diambil dari:

- https://shop.humplus.com/bsm/
- https://humanplusinstitute.myscalev.com/bukusakumanajer

Teks ada di [`src/lib/content.ts`](src/lib/content.ts). Tombol CTA mengarah ke halaman produk Shopee (`ORDER_URL`); harga Rp120.000.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi bila ingin mencatat A/B ke MySQL lokal
npm run build
npm run start                # http://localhost:3000
```

Tanpa variabel DB, halaman tetap jalan; `/api/ab` membalas 503 dan event tidak disimpan.

## A/B test headline hero

- `src/proxy.ts` membagi pengunjung `/` secara acak (bobot sama) ke varian `a`/`b`/`c`, menyimpan varian di cookie `bsm_ab_hero` (30 hari) dan ID anonim di `bsm_vid`, lalu me-rewrite ke halaman statis `/v/[varian]`. URL tetap `/`.
- Teks varian: `headlineVariants` di `src/lib/content.ts`. Konfigurasi: `src/lib/ab-config.ts`.
- Pratinjau semua varian: `/ab`. Paksa satu varian: `/?hl=b` (tidak mengubah cookie; event ditandai `forced` dan tidak dihitung).
- Event `ab_headline_view` dan `ab_cta_click` (dengan posisi tombol) dikirim ke `POST /api/ab` lalu disimpan di tabel MySQL `ab_events` (dibuat otomatis).
- Hasil: `GET /api/ab/stats` dengan header `Authorization: Bearer <AB_STATS_TOKEN>` atau `?token=`.
- Memulai eksperimen baru: ubah `AB_EXPERIMENT` agar pengunjung dibagi ulang.

## Environment variables

Lihat [`.env.example`](.env.example). Di Hostinger diisi lewat hPanel → Node.js → Environment variables (jangan di-commit):
`DB_HOST` (127.0.0.1), `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AB_STATS_TOKEN`.

## Deploy

Hosting Node.js di Hostinger (dibutuhkan untuk proxy A/B dan API; hosting statis tidak cukup).
