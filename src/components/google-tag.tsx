import { GOOGLE_TAG_ID, GTM_CONTAINER_ID, googleTagInitScript, gtmContainerScript } from "@/lib/analytics";

/**
 * Google tag (GA4 "Buku Saku Manajer 2027", G-VCW01D9KTE) + kontainer GTM tim marketing
 * (GTM-NNJN89S3). Dipasang di halaman publik
 * (landing & checkout), sengaja TIDAK di dashboard admin agar aktivitas internal tidak
 * tercatat di GA4. React memindahkan <script async src> ke <head>.
 */
export function GoogleTag() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_ID}`} />
      <script dangerouslySetInnerHTML={{ __html: googleTagInitScript() }} />
      {/* Kontainer GTM tim marketing — sesudah init di atas agar user_properties A/B & gtag('js') GA4 lebih dulu. */}
      <script dangerouslySetInnerHTML={{ __html: gtmContainerScript() }} />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
