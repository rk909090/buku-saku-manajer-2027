# Buku Saku Manajer — Landing Page

Landing page untuk **Buku Saku Manajer Edisi Kedua** (Armala · Human Plus Institute), dibangun dengan Next.js 16.
Produksi: https://bsm.humplus.com

## Isi & sumber materi

Semua copywriting dan foto diambil dari:

- https://shop.humplus.com/bsm/
- https://humanplusinstitute.myscalev.com/bukusakumanajer

Teks ada di [`src/lib/content.ts`](src/lib/content.ts). Semua tombol beli menuju keranjang situs (`/checkout?add=buku-saku-manajer`); teks harga Rp120.000 + “Belum termasuk ongkos kirim”. Harga yang ditagih diambil dari tabel `products` (diubah di dashboard) — samakan teks `price` di `content.ts` bila harga diubah.

## Foto buku (foto asli)

- `public/images/buku/` berisi foto asli dari pemilik (17 Nov 2026), dikompres ke WebP (sampul depan JPG untuk email & gambar OG). Render 3D lama (`bsm-cover.png`, `bsm-mockup.webp`) tidak dipakai lagi di halaman; filenya dibiarkan agar gambar di email yang sudah terkirim tidak rusak.
- Hero: `sampul-foto.webp` · Kenali Bukunya: `membaca-bab-goal.webp` (3:4) · Kutipan Armala (KPI): `pembatas-mengukur-kinerja.webp` (1:1) · Penawaran: `tumpukan-buku-tegak.webp` (2:3) · Penutup, produk/checkout, email, OG & JSON-LD: `sampul-depan.jpg`. Rasio dipilih agar tinggi foto ≈ tinggi kolom teks di sebelahnya (desktop).
- Bagian "Intip Isi Buku" (`src/components/book-preview.tsx`): spread + close-up halaman 70–71 (goal), 116–117 (delegasi), 138–139 (sistem kontrol), 192–193 (mengukur kinerja/KPI), dengan jendela pembesar (ukuran asli, bisa digeser). Ringkasan kartu hanya berisi hal yang terlihat di foto.
- `bsm-isi-smart.webp` dan `bsm-daftar-isi.webp` (dari sumber [S1]) tidak dipakai lagi di halaman; nomor halaman di daftar isi tersebut tidak cocok dengan cetakan yang difoto pemilik.

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
`BITESHIP_API_KEY`, `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `RESEND_API_KEY` (opsional `EMAIL_FROM`).

## Toko: keranjang, ongkir & pembayaran

- **Keranjang** (`src/components/shop/cart-store.ts`): disimpan di `localStorage` (`bsm_cart_v1`). Checkout di `/checkout`, status pesanan di `/checkout/status?order=…&t=…`.
- **Ongkir — Biteship**: pencarian wilayah `GET /api/shop/areas` → Maps API; tarif `POST /api/shop/rates` → Rates API (`/v1/rates/couriers`). Asal pengiriman & daftar kurir diatur di dashboard → Pengaturan; berat/dimensi di dashboard → Produk.
- **Pembayaran — Xendit Payment Sessions** (`mode: PAYMENT_LINK`): `POST /api/shop/orders` menghitung ulang harga & ongkir di server, menyimpan pesanan (`pending_payment`), lalu mengarahkan pembeli ke halaman bayar Xendit (berlaku 24 jam).
- **Konfirmasi bayar**: webhook `POST /api/webhooks/xendit` (cek header `x-callback-token`, dedup di `webhook_events`) → status sesi diverifikasi ulang via `GET /sessions/{id}` (reference, jumlah, mata uang) sebelum pesanan ditandai `paid` dan stok dikurangi. Redirect browser tidak pernah dipercaya.
- **Belum siap?** Bila kunci API, token webhook, lokasi asal, kurir, atau berat produk belum diisi, `/checkout` menampilkan tombol cadangan ke Shopee/Tokopedia/WhatsApp (`checkout-unavailable.tsx`). Daftar persiapan tampil di dashboard → Ringkasan.
- **Funnel GA4**: `add_to_cart` (klik tombol beli) → `begin_checkout` → `add_shipping_info` → `add_payment_info` → `purchase` (sekali per pesanan). Pesanan juga menyimpan varian headline (`ab_variant`) untuk atribusi A/B.

## Diskon & kupon (dashboard → Diskon & Kupon)

- **Diskon produk**: persen atau nominal, untuk satu/semua produk, dengan periode mulai–berakhir (WIB). Otomatis tampil sebagai harga coret di checkout; bila beberapa diskon cocok dipakai potongan terbesar.
- **Kupon**: persen (opsional maks. potongan), nominal, atau gratis ongkir (opsional maks.); kupon persen/nominal bisa ditambah “+ Gratis ongkir”; min. belanja, periode, kuota total, kuota per pelanggan (email), aktif/nonaktif. Satu kupon per pesanan, bisa digabung dengan diskon produk.
- Tautan promosi: `/checkout?add=buku-saku-manajer&kupon=KODE` memasang kupon otomatis. Kolom kupon di checkout hanya muncul bila ada kupon yang sedang berlaku.
- Kuota total menghitung pesanan yang belum kedaluwarsa/dibatalkan (dikunci `SELECT … FOR UPDATE` saat pesanan dibuat); kuota per pelanggan menghitung pesanan yang sudah dibayar.
- **Minimal total pembayaran** (Pengaturan, default Rp10.000): potongan dikurangi bila total akan turun di bawahnya. Batas bawah per metode menurut Xendit: BCA VA & Alfamart/Indomaret Rp10.000, kartu Rp5.000, DANA/OVO Rp100, QRIS/ShopeePay/GoPay Rp1.
- **Landing page saat diskon aktif**: harga coret + label “Hemat X%”, kartu hitung mundur di hero/penawaran/penutup, dan strip hitung mundur di bilah CTA mobile (`src/components/promo/promo-ui.tsx`). Data diambil `getLandingPromo()` (`use cache`, profil `minutes`, tag `landing-promo` yang di-invalidasi saat admin mengubah diskon/produk) sehingga ikut di HTML statis; detik dihitung di browser dari `ends_at` di DB. Diskon tanpa tanggal berakhir tampil tanpa hitung mundur. Saat waktu habis, harga kembali normal tanpa reload. JSON-LD `offers.price` mengikuti harga yang tampil (+`priceValidUntil`).
- Xendit tidak punya tipe item diskon, jadi potongan dimasukkan ke harga item; jumlah item selalu = total tagihan (`src/lib/shop/pricing.ts`).

## Email notifikasi (Resend)

- Dikirim lewat Resend REST API (`src/lib/email/send.ts`) dari `noreply@humplus.com` (bisa diganti dengan env `EMAIL_FROM`). Butuh env `RESEND_API_KEY` dan domain humplus.com terverifikasi di Resend.
- **Pelanggan**: pesanan dibuat (dengan tombol bayar), pembayaran diterima, diproses, dikirim (nomor resi), resi diubah, selesai, dibatalkan, kedaluwarsa (`src/lib/email/templates.ts`).
- **Admin**: pesanan dibayar → semua email di Dashboard → Pengaturan → Notifikasi email (bisa banyak; opsional juga saat pesanan dibuat).
- Dikirim dengan `after()` (setelah respons selesai) agar checkout/webhook tidak tertunda; `Idempotency-Key` per pesanan + jenis mencegah email ganda; hasil (terkirim/gagal/dilewati) dicatat di riwayat pesanan.
- Pratinjau desain & tombol "Kirim email uji" ada di Dashboard → Pengaturan.

## Nomor WhatsApp toko

- Diatur admin di Dashboard → Pengaturan → Kontak WhatsApp (input 08… atau 62…, disimpan sebagai 62…).
- Dipakai di tombol chat landing page (`getPublicWhatsapp()`, `use cache` + tag `site-contact`, langsung diperbarui saat disimpan), tombol WhatsApp di checkout (lewat `/api/shop/catalog`), dan email pelanggan.
- `WHATSAPP_URL` di `content.ts` hanya cadangan bila database tidak tersedia.

## Dashboard admin (`/admin`)

- Menu sidebar kiri: Ringkasan, Pesanan, Pelanggan, Produk, Diskon & Kupon, Analitik A/B, Pengaturan, Admin & Akun.
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
