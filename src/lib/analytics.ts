/**
 * Konfigurasi pelacakan.
 *
 * GOOGLE_TAG_ID adalah Google tag milik properti GA4 "Buku Saku Manajer 2027"
 * (akun Humplus, property 564799693, measurement ID G-VCW01D9KTE, stream https://bsm.humplus.com).
 * Snippet-nya (src/app/layout.tsx) persis seperti di GA4 > Data streams > View tag instructions.
 * Konfigurasi GA4 + enhanced measurement (page_view, scroll, klik keluar, dll.) sudah ada di
 * dalam Google tag tersebut, jadi tidak perlu gtag('config').
 *
 * Yang ditambahkan oleh situs ini:
 *   - Di <head>, sebelum gtag('js'):
 *       gtag('set', 'user_properties', { headline_variant, ab_experiment })  → user property
 *       gtag('set', { traffic_type: 'internal' })  → hanya untuk pratinjau ?hl=
 *     (Catatan uji 17 Nov 2026: parameter kustom lewat gtag('set', {...}) TIDAK ikut terkirim
 *      oleh Google tag ini, sedangkan traffic_type ikut. Karena itu varian dikirim sebagai
 *      user property + parameter eksplisit di event di bawah.)
 *   - Saat headline tampil (ab-tracker.tsx):
 *       gtag('event', 'headline_view', { headline_variant, ab_experiment })
 *   - Saat tombol "Beli Sekarang" diklik (ab-tracker.tsx): add_to_cart (+ cta_placement, varian)
 *   - Checkout & status pesanan (src/lib/ga.ts): begin_checkout, add_shipping_info,
 *     add_payment_info, purchase (key event bawaan GA4).
 *   (marketplace_click dipakai sampai 17 Nov 2026 saat tombol masih ke Shopee/Tokopedia.)
 *   - dataLayer juga menerima objek { event: 'ab_headline_view' | 'ab_cta_click', ... } untuk
 *     dipakai bila nanti memakai container Google Tag Manager biasa.
 */
import { AB_COOKIE, AB_EXPERIMENT, AB_QUERY_PARAM, AB_VARIANTS } from "@/lib/ab-config";

export const GOOGLE_TAG_ID = "GTM-KFQV25X2";

/**
 * Kontainer Google Tag Manager milik tim marketing Human Plus (dikirim 25 Nov 2026), untuk tag iklan
 * yang mereka kelola sendiri. Berbeda dengan GOOGLE_TAG_ID (Google tag GA4): ini kontainer GTM web
 * biasa, jadi dipasang dengan snippet resmi GTM yang mengirim event 'gtm.js'. Kode yang dikirim
 * memakai bentuk gtag('js') — diuji 25 Nov 2026: bentuk itu tidak menghasilkan event 'gtm.js',
 * sehingga trigger "All Pages / Page View" di GTM tidak akan jalan. Dengan snippet resmi, GA4 bsm
 * tetap mengirim tepat satu page_view (sudah diuji). Saat dipasang, kontainer masih kosong (versi 1).
 */
export const GTM_CONTAINER_ID = "GTM-NNJN89S3";

/** Snippet resmi Google Tag Manager (bagian <head>). */
export function gtmContainerScript(id: string = GTM_CONTAINER_ID) {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(id)});`;
}

/** Nama event GA4 untuk klik tombol beli (sejak checkout situs: event e-commerce standar). */
export const GA_CTA_EVENT = "add_to_cart";

/** Nama event GA4 saat headline hero tampil (penyebut conversion rate per varian). */
export const GA_VIEW_EVENT = "headline_view";

/**
 * Isi script inline di <head>: snippet Google tag dari GA4, ditambah gtag('set') varian A/B
 * SEBELUM gtag('js'). Urutan ini penting: Google tag mengirim page_view saat memproses
 * gtag('js'), jadi 'set' yang datang sesudahnya tidak ikut di page_view (sudah diuji).
 * Varian dibaca dengan aturan yang sama seperti src/proxy.ts: ?hl= bila valid, kalau tidak
 * dari cookie varian (cookie dari respons sudah tersedia saat script ini jalan).
 */
export function googleTagInitScript() {
  const variants = JSON.stringify(AB_VARIANTS);
  return [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "(function(){try{",
    `if(location.pathname!=='/')return;`,
    `var V=${variants},p=new URLSearchParams(location.search).get(${JSON.stringify(AB_QUERY_PARAM)}),v=null,f=V.indexOf(p)>-1;`,
    `if(f){v=p;}else{var m=document.cookie.match(/(?:^|; )${AB_COOKIE}=([^;]+)/);`,
    `if(m){var s=decodeURIComponent(m[1]).split('.');if(s[0]===${JSON.stringify(AB_EXPERIMENT)}&&V.indexOf(s[1])>-1)v=s[1];}}`,
    `if(v)gtag('set','user_properties',{headline_variant:v,ab_experiment:${JSON.stringify(AB_EXPERIMENT)}});`,
    "if(f)gtag('set',{traffic_type:'internal'});",
    "}catch(e){}})();",
    "gtag('js', new Date());",
  ].join("\n");
}
