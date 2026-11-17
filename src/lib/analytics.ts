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
 *   - Saat tombol CTA diklik (ab-tracker.tsx):
 *       gtag('event', 'marketplace_click', { marketplace, cta_placement, headline_variant, ab_experiment })
 *     → ditandai sebagai key event di GA4.
 *   - dataLayer juga menerima objek { event: 'ab_headline_view' | 'ab_cta_click', ... } untuk
 *     dipakai bila nanti memakai container Google Tag Manager biasa.
 */
import { AB_COOKIE, AB_EXPERIMENT, AB_QUERY_PARAM, AB_VARIANTS } from "@/lib/ab-config";

export const GOOGLE_TAG_ID = "GTM-KFQV25X2";

/** Nama event GA4 untuk klik tombol beli (key event). */
export const GA_CTA_EVENT = "marketplace_click";

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
