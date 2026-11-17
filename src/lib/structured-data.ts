import { aboutBook, chapters, faqs, price, readers } from "@/lib/content";
import { AUTHOR, ORGANIZATION, SEO_DESCRIPTION, SEO_TITLE, SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * JSON-LD (schema.org) untuk SEO, AEO, dan GEO.
 * Hanya fakta yang tampil di halaman / ada di sumber. Sengaja TIDAK memuat:
 *  - aggregateRating / review: ulasan Google di halaman adalah ulasan pelatihan, bukan buku.
 *  - isbn, numberOfPages, bookFormat, availability: tidak diketahui dari sumber.
 */
const plain = (s: string) =>
  s.replace(/_\*\*|\*\*_|\*\*/g, "").replace(/(^|[\s(“‘])_|_(?=[\s.,)”’]|$)/g, "$1");

const id = {
  website: `${SITE_URL}/#website`,
  webpage: `${SITE_URL}/#webpage`,
  org: `${SITE_URL}/#organization`,
  author: `${SITE_URL}/#armala`,
  book: `${SITE_URL}/#book`,
  faq: `${SITE_URL}/#faq`,
};

/**
 * `offer` (opsional): harga yang sedang tampil di halaman (mis. harga promo) — structured data harus sama
 * dengan harga yang terlihat. Tanpa itu dipakai harga dari content.ts.
 */
export function buildStructuredData(offer?: { price: number; validUntil: Date | null }) {
  // Foto asli buku (bukan render 3D).
  const cover = `${SITE_URL}/images/buku/sampul-depan.jpg`;
  const coverPhoto = `${SITE_URL}/images/buku/sampul-foto.webp`;
  const stack = `${SITE_URL}/images/buku/tumpukan-buku.webp`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": id.website,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: "id-ID",
        publisher: { "@id": id.org },
      },
      {
        "@type": "WebPage",
        "@id": id.webpage,
        url: `${SITE_URL}/`,
        name: SEO_TITLE,
        description: SEO_DESCRIPTION,
        inLanguage: "id-ID",
        isPartOf: { "@id": id.website },
        about: { "@id": id.book },
        mainEntity: { "@id": id.book },
        primaryImageOfPage: { "@type": "ImageObject", url: cover, width: 622, height: 978 },
      },
      {
        "@type": "Organization",
        "@id": id.org,
        name: ORGANIZATION.name,
        legalName: ORGANIZATION.legalName,
        url: ORGANIZATION.url,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo-hpi.png`, width: 350, height: 100 },
        image: `${SITE_URL}/images/pelatihan/01.webp`, // "Pelatihan Human Plus Institute"
        slogan: ORGANIZATION.slogan,
        description: ORGANIZATION.description,
        telephone: ORGANIZATION.telephone,
        address: {
          "@type": "PostalAddress",
          streetAddress: ORGANIZATION.streetAddress,
          addressLocality: ORGANIZATION.addressLocality,
          postalCode: ORGANIZATION.postalCode,
          addressCountry: ORGANIZATION.addressCountry,
        },
        sameAs: ORGANIZATION.sameAs,
        founder: { "@id": id.author },
      },
      {
        "@type": "Person",
        "@id": id.author,
        name: AUTHOR.name,
        jobTitle: AUTHOR.jobTitle,
        description: AUTHOR.description,
        award: AUTHOR.award,
        worksFor: { "@id": id.org },
        image: `${SITE_URL}/images/armala-pegang-buku-saku.jpeg`,
      },
      {
        "@type": ["Book", "Product"],
        "@id": id.book,
        name: "Buku Saku Manajer",
        alternateName: "Buku Saku Manajer Edisi Kedua",
        bookEdition: "Edisi Kedua",
        description: aboutBook.lead,
        inLanguage: "id",
        genre: "Manajemen",
        image: [cover, coverPhoto, stack],
        author: { "@id": id.author },
        publisher: { "@id": id.org },
        brand: { "@type": "Brand", name: ORGANIZATION.name },
        audience: {
          "@type": "PeopleAudience",
          audienceType: readers.groups.map((g) => `${g.level} (${g.role})`).join(", "),
        },
        hasPart: chapters.map((ch, i) => ({
          "@type": "Chapter",
          position: i + 1,
          name: `${ch.no}: ${ch.title}`,
          about: ch.topics.map((t) => t.title),
        })),
        offers: {
          "@type": "Offer",
          url: `${SITE_URL}/`,
          price: offer ? String(offer.price) : price.replace(/\D/g, ""),
          priceCurrency: "IDR",
          ...(offer?.validUntil ? { priceValidUntil: offer.validUntil.toISOString().slice(0, 10) } : {}),
          seller: { "@id": id.org },
        },
      },
      {
        "@type": "FAQPage",
        "@id": id.faq,
        isPartOf: { "@id": id.webpage },
        inLanguage: "id-ID",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: plain(f.a) },
        })),
      },
    ],
  };
}
