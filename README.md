# Buku Saku Manajer — Landing Page

Landing page untuk **Buku Saku Manajer Edisi Kedua** (Armala · Human Plus Institute), dibangun dengan Next.js 16.
Produksi: https://bsm.humplus.com

## Isi & sumber materi

Semua copywriting dan foto diambil dari:

- https://shop.humplus.com/bsm/
- https://humanplusinstitute.myscalev.com/bukusakumanajer

Teks ada di [`src/lib/content.ts`](src/lib/content.ts). Semua tombol beli menuju keranjang situs (`/checkout?add=buku-saku-manajer`); teks harga Rp120.000 + “Belum termasuk ongkos kirim”. Harga yang ditagih diambil dari tabel `products` (diubah di dashboard) — samakan teks `price` di `content.ts` bila harga diubah.

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
- Event `ab_headline_view` dan `ab_cta_click` (dengan posisi tombol; `marketplace` = `checkout`) dikirim ke `POST /api/ab` lalu disimpan di tabel MySQL `ab_events` (dibuat otomatis).
- Hasil: `GET /api/ab/stats` dengan header `Authorization: Bearer <AB_STATS_TOKEN>` atau `?token=`.
- Memulai eksperimen baru: ubah `AB_EXPERIMENT` agar pengunjung dibagi ulang.

## Environment variables

Lihat [`.env.example`](.env.example). Di Hostinger diisi lewat hPanel → Node.js → Environment variables (jangan di-commit):
`DB_HOST` (127.0.0.1), `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AB_STATS_TOKEN`,
`BITESHIP_API_KEY`, `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`.

## Toko: keranjang, ongkir & pembayaran

- **Keranjang** (`src/components/shop/cart-store.ts`): disimpan di `localStorage` (`bsm_cart_v1`). Checkout di `/checkout`, status pesanan di `/checkout/status?order=…&t=…`.
- **Ongkir — Biteship**: pencarian wilayah `GET /api/shop/areas` → Maps API; tarif `POST /api/shop/rates` → Rates API (`/v1/rates/couriers`). Asal pengiriman & daftar kurir diatur di dashboard → Pengaturan; berat/dimensi di dashboard → Produk.
- **Pembayaran — Xendit Payment Sessions** (`mode: PAYMENT_LINK`): `POST /api/shop/orders` menghitung ulang harga & ongkir di server, menyimpan pesanan (`pending_payment`), lalu mengarahkan pembeli ke halaman bayar Xendit (berlaku 24 jam).
- **Konfirmasi bayar**: webhook `POST /api/webhooks/xendit` (cek header `x-callback-token`, dedup di `webhook_events`) → status sesi diverifikasi ulang via `GET /sessions/{id}` (reference, jumlah, mata uang) sebelum pesanan ditandai `paid` dan stok dikurangi. Redirect browser tidak pernah dipercaya.
- **Belum siap?** Bila kunci API, token webhook, lokasi asal, kurir, atau berat produk belum diisi, `/checkout` menampilkan tombol cadangan ke Shopee/Tokopedia/WhatsApp (`checkout-unavailable.tsx`). Daftar persiapan tampil di dashboard → Ringkasan.
- **Funnel GA4**: `add_to_cart` (klik tombol beli) → `begin_checkout` → `add_shipping_info` → `add_payment_info` → `purchase` (sekali per pesanan). Pesanan juga menyimpan varian headline (`ab_variant`) untuk atribusi A/B.

## Dashboard admin (`/admin`)

- Menu sidebar kiri: Ringkasan, Pesanan, Pelanggan, Produk, Analitik A/B, Pengaturan, Admin & Akun.
- Login: sesi acak (hanya hash SHA-256 di DB), cookie `bsm_admin` httpOnly/Secure/SameSite=Lax 7 hari, password scrypt, pembatasan percobaan login, cek same-origin untuk perubahan data.
- Owner pertama dibuat otomatis dari `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` saat tabel admin masih kosong. Owner dapat menambah admin lain; setelah itu hapus kedua variabel tersebut.
- Alur status: `pending_payment` → `paid` → `processing` → `shipped` (wajib no. resi) → `completed`; `expired`/`cancelled`. Membatalkan pesanan yang sudah dibayar mengembalikan stok; **refund dilakukan manual di dashboard Xendit**.
- Ekspor CSV pesanan tersedia di halaman Pesanan.

## Deploy

Hosting Node.js di Hostinger (dibutuhkan untuk proxy A/B dan API; hosting statis tidak cukup).

## SEO, AEO & GEO

- Metadata: `src/app/layout.tsx` + konstanta di `src/lib/seo.ts` (title ≤60, description ≤155, canonical, robots, Open Graph, Twitter).
- Gambar bagikan 1200×630: `src/app/opengraph-image.tsx` (dibuat saat build dari sampul).
- Structured data (JSON-LD `@graph`): `src/lib/structured-data.ts` — WebSite, WebPage, Organization, Person, Book/Product (+2 Offer), FAQPage. Hanya fakta dari sumber; sengaja tanpa rating/ulasan/ISBN.
- `/llms.txt` (ringkasan faktual untuk LLM), `/sitemap.xml` (+ image sitemap), `/robots.txt`, `/favicon.ico`.
- Bot & crawler selalu mendapat varian kontrol (A) tanpa cookie (`src/proxy.ts`).
- IndexNow: kunci di `src/lib/seo.ts`, file verifikasi `public/<kunci>.txt`.
- Verifikasi: Google Search Console (CNAME DNS) dan Bing Webmaster (meta `msvalidate.01`).
