/**
 * Konstanta SEO / AEO / GEO. Semua fakta di sini berasal dari dua halaman sumber
 * (lihat header src/lib/content.ts). Jangan menambah klaim yang tidak ada di sumber
 * (mis. ISBN, jumlah halaman, rating) — data terstruktur harus sesuai isi halaman.
 */
export const SITE_URL = "https://bsm.humplus.com";
export const SITE_NAME = "Buku Saku Manajer";

/** Kunci IndexNow (Bing, dll.); file verifikasinya: public/<kunci>.txt */
export const INDEXNOW_KEY = "67ce568fb5310fdbd4ea3de458c851db";

/** ≤ 60 karakter agar tidak terpotong di hasil pencarian. */
export const SEO_TITLE = "Buku Saku Manajer Edisi Kedua: Panduan Praktis Manajer";

/** ≤ 155 karakter. Isi diringkas dari 6 bab & audiens di halaman Scalev. */
export const SEO_DESCRIPTION =
  "Panduan praktis 6 bab untuk Supervisor, Manager, Direktur & Business Owner: tujuan, perencanaan, kontrol kerja, delegasi, KPI, kepemimpinan. Karya Armala.";

/** Dari meta og:description halaman Scalev. */
export const OG_DESCRIPTION =
  "Pelajari cara mengelola pekerjaan, tim, dan bisnis secara lebih terarah melalui framework G.P.E.R. dalam Buku Saku Manajer karya Armala.";

export const ORGANIZATION = {
  legalName: "PT Human Plus Institute",
  name: "Human Plus Institute",
  url: "https://www.humanplus.co.id",
  slogan: "Change Your Future with Competency.",
  description:
    "Human Plus Institute adalah perusahaan yang bergerak di bidang pengembangan manajemen sumber daya manusia dan konsultan manajemen.",
  streetAddress: "Cyber 2 Tower, 18th Floor, Jl. H.R. Rasuna Said Blok X-5 Kav. 13",
  addressLocality: "Jakarta",
  postalCode: "12950",
  addressCountry: "ID",
  telephone: "+62-21-781-2007",
  sameAs: [
    "https://www.humanplus.co.id",
    "https://www.sekolahmanajer.co.id",
    "https://www.instagram.com/humanplusinstitute",
  ],
};

export const AUTHOR = {
  name: "Armala",
  jobTitle: "Founder dan President Human Plus Institute",
  description: "Armala adalah konsultan manajemen.",
  award: "Master Productivity Specialist dari Association of Productivity Specialists (APS), 2018",
};

/** Fakta singkat buku yang juga ditampilkan di halaman (blok "Detail Buku"). */
export const BOOK_FACTS = [
  { label: "Judul", value: "Buku Saku Manajer — Edisi Kedua" },
  { label: "Penulis", value: "Armala" },
  { label: "Penerbit", value: "PT Human Plus Institute" },
  { label: "Isi", value: "6 bab panduan praktis manajerial" },
  { label: "Bahasa", value: "Indonesia" },
  { label: "Untuk", value: "Supervisor, Manager, Direktur, Business Owner" },
  { label: "Harga", value: "Rp120.000" },
  { label: "Pembelian", value: "Langsung di situs ini, ongkir dihitung saat checkout" },
];
