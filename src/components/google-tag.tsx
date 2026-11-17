import { GOOGLE_TAG_ID, googleTagInitScript } from "@/lib/analytics";

/**
 * Google tag (GA4 "Buku Saku Manajer 2027", G-VCW01D9KTE). Dipasang di halaman publik
 * (landing & checkout), sengaja TIDAK di dashboard admin agar aktivitas internal tidak
 * tercatat di GA4. React memindahkan <script async src> ke <head>.
 */
export function GoogleTag() {
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_ID}`} />
      <script dangerouslySetInnerHTML={{ __html: googleTagInitScript() }} />
    </>
  );
}
