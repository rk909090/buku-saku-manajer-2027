import { MARKETPLACES, aboutBook, chapters, faqs, readers } from "@/lib/content";
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

export function buildStructuredData() {
  const cover = `${SITE_URL}/images/bsm-cover.png`;
  const mockup = `${SITE_URL}/images/bsm-mockup.webp`;

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
        primaryImageOfPage: { "@type": "ImageObject", url: cover, width: 560, height: 778 },
      },
      {
        "@type": "Organization",
        "@id": id.org,
        name: ORGANIZATION.name,
        legalName: ORGANIZATION.legalName,
        url: ORGANIZATION.url,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo-hpi.png`, width: 350, height: 100 },
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
        image: [cover, mockup],
        author: { "@id": id.author },
        publisher: { "@id": id.org },
        brand: { "@type": "Brand", name: ORGANIZATION.name },
        audience: {
          "@type": "Audience",
          audienceType: readers.groups.map((g) => `${g.level} (${g.role})`).join(", "),
        },
        hasPart: chapters.map((ch, i) => ({
          "@type": "Chapter",
          position: i + 1,
          name: `${ch.no}: ${ch.title}`,
          about: ch.topics.map((t) => t.title),
        })),
        offers: (Object.keys(MARKETPLACES) as (keyof typeof MARKETPLACES)[]).map((m) => ({
          "@type": "Offer",
          url: MARKETPLACES[m].url,
          price: "120000",
          priceCurrency: "IDR",
          seller: { "@type": "Organization", name: `${ORGANIZATION.name} (${MARKETPLACES[m].name})` },
        })),
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
