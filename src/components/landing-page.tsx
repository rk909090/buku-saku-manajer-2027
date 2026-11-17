import type { ReactNode } from "react";
import Image from "next/image";
import cover from "../../public/images/bsm-cover.png";
import mockup from "../../public/images/bsm-mockup.webp";
import interior from "../../public/images/bsm-isi-smart.webp";
import toc from "../../public/images/bsm-daftar-isi.webp";
import authorPhoto from "../../public/images/armala-pegang-buku-saku.jpeg";
import logo from "../../public/images/logo-hpi.png";
import {
  aboutBook,
  audience,
  author,
  authorQuote,
  chapters,
  chaptersIntro,
  closing,
  company,
  faqHeading,
  faqs,
  hero,
  institute,
  offer,
  outcomes,
  readers,
  reality,
  reviews,
  roleCases,
  storyBridge,
  storyIntro,
  storyOutro,
  storyPromise,
} from "@/lib/content";
import {
  CheckIcon,
  Container,
  CtaPair,
  Rich,
  StarIcon,
  UserIcon,
  WhatsAppIcon,
} from "@/components/ui";
import { Carousel } from "@/components/interactive";
import { AbTracker } from "@/components/ab-tracker";
import type { HeadlineVariant } from "@/lib/content";
import { AB_EXPERIMENT, AB_QUERY_PARAM } from "@/lib/ab-config";
import { buildStructuredData } from "@/lib/structured-data";
import { GoogleTag } from "@/components/google-tag";
import { CartLink } from "@/components/shop/cart-link";
import { BOOK_FACTS } from "@/lib/seo";
import { getLandingPromo } from "@/lib/shop/landing-promo";
import { getPublicWhatsapp } from "@/lib/shop/public-contact";
import { waLink } from "@/lib/whatsapp";
import { currentDeal, type LandingPromo } from "@/lib/promo-deal";
import { MobilePromoPrice, MobilePromoStrip, PromoCountdown, PromoPriceText, PromoPriceTag } from "@/components/promo/promo-ui";

function abInitScript(variantId: string) {
  const exp = JSON.stringify(AB_EXPERIMENT);
  const v = JSON.stringify(variantId);
  const q = JSON.stringify(AB_QUERY_PARAM);
  // gtag('set') untuk GA4 ada di <head> (src/lib/analytics.ts); di sini hanya objek dataLayer
  // untuk dipakai bila nanti memakai container Google Tag Manager biasa.
  return [
    "window.dataLayer=window.dataLayer||[];",
    `dataLayer.push({ab_experiment:${exp},headline_variant:${v},ab_forced:new URLSearchParams(location.search).has(${q})});`,
  ].join("");
}

/** Seluruh landing page. Hanya headline hero yang berbeda per varian A/B. */
export async function LandingPage({ variant }: { variant: HeadlineVariant }) {
  // Diskon produk (cache ±1 menit + invalidasi saat admin mengubah diskon) — ikut di HTML statis.
  // Nomor WhatsApp dari pengaturan admin (cache ±1 menit, diperbarui segera saat disimpan).
  const [promo, whatsapp] = await Promise.all([getLandingPromo(), getPublicWhatsapp()]);
  // "<" di-escape agar teks JSON tidak bisa menutup tag <script>.
  const deal = currentDeal(promo, null); // diskon yang berlaku saat data diambil server
  const offer = promo ? { price: deal ? deal.price : promo.basePrice, validUntil: deal?.endsAt ? new Date(deal.endsAt) : null } : undefined;
  const jsonLd = JSON.stringify(buildStructuredData(offer)).replace(/</g, "\\u003c");

  return (
    <>
      <GoogleTag />
      {/* Structured data: WebSite, WebPage, Organization, Person, Book/Product, FAQPage */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      {/* Data varian A/B di dataLayer (untuk GTM). GA4 memakai gtag('set') di <head>. */}
      <script dangerouslySetInnerHTML={{ __html: abInitScript(variant.id) }} />
      <SiteHeader />
      <main>
        <Hero variant={variant} promo={promo} />
        <Reality />
        <Story />
        <Audience />
        <AboutBook />
        <Chapters />
        <Readers />
        <Outcomes />
        <Author />
        <Institute />
        <Reviews />
        <Offer promo={promo} />
        <Faq />
        <Closing promo={promo} />
      </main>
      <SiteFooter />
      <MobileCtaBar promo={promo} />
      <WhatsAppButton href={waLink(whatsapp)} />
      <AbTracker variant={variant.id} />
    </>
  );
}

/* ───────────────────────── Shared bits ───────────────────────── */

function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p
      className={`font-display text-sm font-semibold tracking-[0.22em] uppercase ${
        tone === "dark" ? "text-gold-400" : "text-gold-700"
      }`}
    >
      {children}
    </p>
  );
}

function SectionHeading({
  children,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-3xl leading-[1.12] font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] ${
        tone === "dark" ? "text-white" : "text-navy-900"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

function GoldRule({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-1 w-16 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 ${className}`} />;
}

const cardShadow = "shadow-[0_1px_2px_rgb(12_24_48/0.05),0_8px_24px_-12px_rgb(12_24_48/0.18)]";

/* ───────────────────────── Header ───────────────────────── */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-900/10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="#" aria-label="Human Plus Institute">
          <Image src={logo} alt="Human Plus Institute" className="h-9 w-auto sm:h-10" preload />
        </a>
        <div className="flex items-center gap-2">
          <CartLink />
          <div className="hidden sm:block">
            <CtaPair size="sm" placement="header" stretch={false} />
          </div>
        </div>
      </Container>
    </header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ variant, promo }: { variant: HeadlineVariant; promo: LandingPromo | null }) {
  return (
    <section className="hero-bg relative overflow-hidden text-white">
      <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:py-24">
        <div className="text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1 text-xs font-extrabold tracking-wide text-navy-950 uppercase">
              <StarIcon className="size-3.5" />
              {hero.badge}
            </p>
            <p className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              {hero.tag}
            </p>
          </div>

          <p className="mt-6 font-display text-xl font-semibold text-gold-300 sm:text-2xl">{variant.kicker}</p>
          <h1 className="mt-3 font-display text-[2.15rem] leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-[3.4rem]">
            {variant.headline[0]} <span className="gold-text">{variant.headline[1]}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80 lg:mx-0">{hero.lead}</p>

          <div className="mt-8 flex flex-col items-center gap-5 lg:items-start">
            <PromoPriceTag promo={promo} />
            <PromoCountdown promo={promo} />
            <CtaPair placement="hero" className="w-full" />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-sm lg:max-w-[25rem]">
          <div aria-hidden="true" className="absolute inset-x-6 bottom-2 h-10 rounded-[50%] bg-black/60 blur-2xl" />
          <Image
            src={cover}
            alt="Sampul Buku Saku Manajer Edisi Kedua karya Armala, Human Plus Institute"
            className="float-book relative h-auto w-full drop-shadow-[0_30px_40px_rgb(0_0_0/0.55)]"
            sizes="(max-width: 640px) 320px, 400px"
            preload
          />
        </div>
      </Container>
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
    </section>
  );
}

/* ───────────────────────── Realita [S2] ───────────────────────── */

function Reality() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>{reality.eyebrow}</Eyebrow>
          <SectionHeading className="mt-3">{reality.heading}</SectionHeading>
          <p className="mt-5 text-lg leading-relaxed text-muted">{reality.lead}</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {reality.levels.map((l, i) => (
            <article key={l.level} className={`relative rounded-3xl border border-navy-900/8 bg-white p-7 ${cardShadow}`}>
              <span className="font-display text-5xl font-bold text-gold-600" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-2xl font-bold text-navy-900">{l.level}</h3>
              <p className="mt-1 text-sm font-semibold tracking-wide text-gold-700">{l.role}</p>
              <p className="mt-4 leading-relaxed text-ink/85">{l.text}</p>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-3xl rounded-2xl bg-navy-900 px-6 py-6 text-center text-lg leading-relaxed font-semibold text-white sm:px-10">
          {reality.closing}
        </p>
      </Container>
    </section>
  );
}

/* ───────────────────────── Cerita [S1] ───────────────────────── */

function Story() {
  return (
    <section className="border-t border-navy-900/8 bg-white py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl space-y-6 text-[1.075rem] leading-[1.85] text-ink/90 [&_strong]:text-navy-900">
          {storyIntro.map((p, i) => (
            <p key={i} className={i === 0 ? "drop-cap" : undefined}>
              <Rich text={p} />
            </p>
          ))}
        </div>

        <blockquote className="mx-auto my-14 max-w-4xl border-y border-gold-500/40 py-8 text-center font-display text-2xl leading-snug font-semibold text-navy-900 sm:text-3xl">
          {storyBridge}
        </blockquote>

        <div className="grid gap-5 lg:grid-cols-3">
          {roleCases.map((c) => (
            <article
              key={c.role}
              className="relative flex flex-col overflow-hidden rounded-3xl bg-navy-900 p-7 text-white/80 shadow-lg [&_strong]:text-white"
            >
              <div aria-hidden="true" className="absolute -top-16 -right-16 size-40 rounded-full bg-gold-500/15 blur-2xl" />
              <p className="font-display text-sm font-semibold tracking-[0.2em] text-gold-400 uppercase">{c.role}</p>
              <p className="mt-2 font-display text-2xl leading-tight font-bold text-white">{c.nickname}</p>
              <div aria-hidden="true" className="my-5 h-px bg-white/10" />
              <p className="leading-relaxed">
                <Rich text={c.text} />
              </p>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-3xl space-y-6 text-[1.075rem] leading-[1.85] text-ink/90">
          {storyOutro.map((p, i) => (
            <p key={i}>
              <Rich text={p} />
            </p>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-2xl border-l-4 border-gold-500 bg-cream p-6 sm:p-8">
          <p className="text-lg leading-relaxed font-semibold text-navy-900 sm:text-xl">{storyPromise}</p>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Apakah Anda? [S1] ───────────────────────── */

function Audience() {
  return (
    <section className="bg-cream py-16 sm:py-24">
      <Container>
        <div className="text-center">
          <SectionHeading className="uppercase">{audience.heading}</SectionHeading>
          <GoldRule className="mx-auto mt-5" />
        </div>

        <ul className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {audience.points.map((point, i) => (
            <li
              key={point}
              className={`flex gap-4 rounded-2xl border border-navy-900/8 bg-white p-6 ${cardShadow} lg:col-span-2 ${
                i === 3 ? "lg:col-start-2" : ""
              } ${i === 4 ? "sm:col-span-2 lg:col-span-2" : ""}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-900 text-gold-400">
                <UserIcon className="size-5" />
              </span>
              <p className="text-[1.05rem] leading-relaxed text-ink">{point}</p>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl bg-navy-900 px-6 py-10 text-center shadow-xl sm:px-10">
          <p className="font-display text-2xl font-bold tracking-wide uppercase sm:text-4xl">
            <span className="gold-text">{audience.verdict}</span>
          </p>
          <CtaPair placement="audience" align="center" className="mt-6" />
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Kenali Bukunya [S2 + S1] ───────────────────────── */

function AboutBook() {
  return (
    <section className="hero-bg relative overflow-hidden py-16 text-white sm:py-24">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="relative mx-auto w-full max-w-md">
          <div aria-hidden="true" className="absolute inset-0 rounded-full bg-gold-500/20 blur-3xl" />
          <Image
            src={interior}
            alt="Halaman isi Buku Saku Manajer yang membahas penetapan sasaran SMART"
            className="relative h-auto w-full rounded-3xl shadow-2xl ring-1 ring-white/10"
            sizes="(max-width: 640px) 100vw, 448px"
          />
        </div>

        <div>
          <Eyebrow tone="dark">{aboutBook.eyebrow}</Eyebrow>
          <SectionHeading tone="dark" className="mt-3">
            {aboutBook.heading}
          </SectionHeading>
          <p className="mt-5 text-lg leading-relaxed text-white/75">{aboutBook.lead}</p>
          <ul className="mt-8 space-y-5">
            {aboutBook.features.map((f) => (
              <li key={f} className="flex gap-4">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold-500 text-navy-950">
                  <CheckIcon className="size-4" />
                </span>
                <p className="text-lg leading-relaxed text-white/85">{f}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Isi 6 Bab [S2] ───────────────────────── */

function Chapters() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>{chaptersIntro.eyebrow}</Eyebrow>
          <SectionHeading className="mt-3">{chaptersIntro.heading}</SectionHeading>
          <p className="mt-5 text-lg leading-relaxed text-muted">{chaptersIntro.lead}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {chapters.map((ch) => (
            <article key={ch.no} className={`flex flex-col rounded-3xl border border-navy-900/8 bg-white p-6 sm:p-8 ${cardShadow}`}>
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-navy-900 px-3 py-1 font-display text-sm font-semibold tracking-widest text-gold-400">
                  {ch.no}
                </span>
              </div>
              <h3 className="mt-4 font-display text-2xl leading-tight font-bold text-navy-900 sm:text-[1.7rem]">{ch.title}</h3>

              <div className="mt-5 rounded-2xl bg-promo/[0.06] p-4 ring-1 ring-promo/15">
                <p className="text-xs font-bold tracking-wide text-promo-dark uppercase">{chaptersIntro.problemLabel}</p>
                <p className="mt-1.5 leading-relaxed text-ink/85 italic">{ch.problem}</p>
              </div>

              <p className="mt-6 text-xs font-bold tracking-wide text-gold-700 uppercase">{chaptersIntro.solutionLabel}</p>
              <ul className="mt-3 space-y-3">
                {ch.topics.map((t) => (
                  <li key={t.title} className="flex gap-3">
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500 text-navy-950">
                      <CheckIcon className="size-3" />
                    </span>
                    <p className="leading-relaxed text-ink/85">
                      <strong className="text-navy-900">{t.title}:</strong> <Rich text={t.text} />
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Image
            src={toc}
            alt="Daftar isi Buku Saku Manajer"
            className={`mx-auto h-auto w-full max-w-sm rounded-3xl ${cardShadow}`}
            sizes="(max-width: 640px) 100vw, 384px"
          />
          <figure className="relative">
            <svg viewBox="0 0 32 32" aria-hidden="true" className="size-12 text-gold-500">
              <path fill="currentColor" d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8Zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8Z" />
            </svg>
            <blockquote className="mt-4 font-display text-2xl leading-snug font-semibold text-navy-900 sm:text-3xl">
              {authorQuote.quote}
            </blockquote>
            <figcaption className="mt-5 font-semibold text-gold-700">{authorQuote.cite}</figcaption>
            <div className="mt-8">
              <CtaPair placement="chapters" />
            </div>
          </figure>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Rekomendasi Pembaca [S2] ───────────────────────── */

function Readers() {
  return (
    <section className="bg-cream py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>{readers.eyebrow}</Eyebrow>
          <SectionHeading className="mt-3">{readers.heading}</SectionHeading>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {readers.groups.map((g) => (
            <article key={g.level} className={`flex flex-col rounded-3xl bg-white p-6 ${cardShadow}`}>
              <span className="grid size-11 place-items-center rounded-xl bg-navy-900 text-gold-400">
                <UserIcon className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-navy-900">{g.level}</h3>
              <p className="mt-1 text-sm font-semibold text-gold-700">{g.role}</p>
              <p className="mt-3 leading-relaxed text-ink/85">{g.text}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Hasil [S1] ───────────────────────── */

function Outcomes() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-2xl leading-tight font-bold tracking-tight text-navy-900 uppercase sm:text-4xl">
            {outcomes.heading}
          </h2>
          <GoldRule className="mx-auto mt-6" />
        </div>

        <ol className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outcomes.points.map((p, i) => (
            <li
              key={p}
              className={`group flex items-center gap-4 rounded-2xl border border-navy-900/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold-500/60 hover:shadow-lg ${
                i === outcomes.points.length - 1 ? "sm:col-span-2 lg:col-span-1 lg:col-start-2" : ""
              }`}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy-900 font-display text-xl font-bold text-gold-400 transition group-hover:bg-gold-500 group-hover:text-navy-950">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="leading-snug font-semibold text-navy-900">{p}</p>
            </li>
          ))}
        </ol>

        <CtaPair placement="outcomes" align="center" className="mt-12" />
      </Container>
    </section>
  );
}

/* ───────────────────────── Penulis [S1 + S2] ───────────────────────── */

function Author() {
  return (
    <section className="overflow-x-clip bg-cream py-16 sm:py-24">
      <Container className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="relative mx-auto w-full max-w-md lg:sticky lg:top-24">
          <div aria-hidden="true" className="absolute -inset-3 translate-x-4 translate-y-4 rounded-[2rem] border-2 border-gold-500/60" />
          <Image
            src={authorPhoto}
            alt="Armala memegang Buku Saku Manajer"
            className="relative h-auto w-full rounded-[2rem] object-cover shadow-2xl"
            sizes="(max-width: 1024px) 100vw, 448px"
          />
        </div>

        <div>
          <Eyebrow>{author.eyebrow}</Eyebrow>
          <SectionHeading className="mt-3">
            Siapa <span className="text-gold-700">ARMALA</span>?
          </SectionHeading>
          <p className="mt-3 text-xl font-semibold text-navy-800">{author.subheading}</p>

          <ul className="mt-8 space-y-4">
            {author.points.map((p) => (
              <li key={p} className={`flex gap-4 rounded-2xl bg-white p-5 [&_strong]:text-navy-900 ${cardShadow}`}>
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-gold-400">
                  <StarIcon className="size-3.5" />
                </span>
                <p className="leading-relaxed text-ink/90">
                  <Rich text={p} />
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-navy-900/10 bg-white/60 p-6">
            <ul className="space-y-3">
              {author.backCover.map((p) => (
                <li key={p} className="flex gap-3 leading-relaxed text-ink/85 [&_strong]:text-navy-900">
                  <CheckIcon className="mt-1 size-4 shrink-0 text-gold-600" />
                  <p>
                    <Rich text={p} />
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted italic">{author.backCoverSource}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Human Plus Institute [S2] ───────────────────────── */

function Institute() {
  return (
    <section className="bg-navy-950 pt-16 pb-10 text-white sm:pt-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-block rounded-2xl bg-white px-5 py-3">
            <Image src={logo} alt="Human Plus Institute" className="h-10 w-auto" />
          </div>
          <SectionHeading tone="dark" className="mt-8">
            {institute.heading}
          </SectionHeading>
          <p className="mt-5 text-lg leading-relaxed text-white/75">{institute.lead}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {institute.photos.map((p) => (
            <Image
              key={p.src}
              src={p.src}
              alt={p.alt}
              width={p.w}
              height={p.h}
              className="aspect-[3/2] h-auto w-full rounded-2xl object-cover"
              sizes="(max-width: 1024px) 50vw, 25vw"
            />
          ))}
        </div>

        <div className="mt-6">
          <Carousel label="Dokumentasi pelatihan Human Plus Institute">
            {institute.gallery.map((p) => (
              <Image
                key={p.src}
                src={p.src}
                alt={p.alt}
                width={p.w}
                height={p.h}
                className="aspect-[3/2] w-[78%] shrink-0 snap-start rounded-2xl object-cover sm:w-[44%] lg:w-[30%]"
                sizes="(max-width: 640px) 78vw, (max-width: 1024px) 44vw, 30vw"
              />
            ))}
          </Carousel>
          <p className="mt-2 text-sm text-white/55">{institute.galleryNote}</p>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Ulasan [S2] ───────────────────────── */

function Reviews() {
  return (
    <section className="bg-navy-950 pt-10 pb-16 text-white sm:pb-24">
      <Container>
        <SectionHeading tone="dark" className="text-center">
          {reviews.heading}
        </SectionHeading>
        <div className="mt-10">
          <Carousel label={reviews.heading}>
            {reviews.items.map((r) => (
              <div
                key={r.src}
                className="flex w-[88%] shrink-0 snap-start items-center rounded-2xl bg-[#202124] p-2 ring-1 ring-white/10 sm:w-[60%] lg:w-[46%]"
              >
                <Image
                  src={r.src}
                  alt={r.alt}
                  width={r.w}
                  height={r.h}
                  className="h-auto w-full rounded-xl"
                  sizes="(max-width: 640px) 88vw, (max-width: 1024px) 60vw, 520px"
                />
              </div>
            ))}
          </Carousel>
          <p className="mt-2 text-sm text-white/55">{reviews.note}</p>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Penawaran [S2] ───────────────────────── */

function Offer({ promo }: { promo: LandingPromo | null }) {
  return (
    <section id="beli" className="scroll-mt-20 py-16 sm:py-24">
      <Container>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-navy-900 text-white shadow-2xl">
          <div aria-hidden="true" className="absolute -top-24 -left-24 size-72 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="relative grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:p-12">
            <Image
              src={mockup}
              alt="Buku Saku Manajer Edisi Kedua"
              className="mx-auto h-auto w-full max-w-sm rounded-3xl"
              sizes="(max-width: 768px) 100vw, 420px"
            />
            <div>
              <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">{offer.title}</h2>
              <p className="mt-2 text-white/65">{offer.byline}</p>

              <div className="mt-6 flex flex-col items-start gap-5">
                <PromoPriceTag promo={promo} align="left" />
                <PromoCountdown promo={promo} />
              </div>

              {/* Fakta ringkas buku (sama dengan src/lib/seo.ts BOOK_FACTS & JSON-LD) */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-display text-sm font-semibold tracking-[0.2em] text-gold-400 uppercase">Detail Buku</h3>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  {BOOK_FACTS.map((f) => (
                    <div key={f.label} className="contents">
                      <dt className="text-white/55">{f.label}</dt>
                      <dd className="font-medium text-white/90">{f.label === "Harga" ? <PromoPriceText promo={promo} fallback={f.value} /> : f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <CtaPair placement="offer" className="mt-8" itemClassName="w-full sm:w-auto sm:shrink-0 sm:grow" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── FAQ [S2] ───────────────────────── */

function Faq() {
  return (
    <section className="bg-cream py-16 sm:py-24">
      <Container className="max-w-3xl">
        <SectionHeading className="text-center">{faqHeading}</SectionHeading>
        <GoldRule className="mx-auto mt-5" />
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              open={i === 0}
              className={`group rounded-2xl bg-white ${cardShadow} [&_summary::-webkit-details-marker]:hidden`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-navy-900 sm:p-6 sm:text-lg">
                {f.q}
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream text-gold-600 transition group-open:rotate-45">
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-4">
                    <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
                  </svg>
                </span>
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-ink/85 sm:px-6 sm:pb-6 [&_strong]:text-navy-900">
                <Rich text={f.a} />
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────── Penutup [S2] ───────────────────────── */

function Closing({ promo }: { promo: LandingPromo | null }) {
  return (
    <section className="hero-bg py-16 text-center text-white sm:py-24">
      <Container className="max-w-3xl">
        <SectionHeading tone="dark">{closing.heading}</SectionHeading>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/75">{closing.lead}</p>
        <Image
          src={cover}
          alt="Buku Saku Manajer"
          className="mx-auto mt-10 h-auto w-48 drop-shadow-[0_20px_30px_rgb(0_0_0/0.5)] sm:w-56"
          sizes="224px"
        />
        <div className="mt-8 flex flex-col items-center gap-6">
          <PromoPriceTag promo={promo} align="center" />
          <PromoCountdown promo={promo} />
        </div>
        <CtaPair placement="closing" align="center" className="mt-8" />
      </Container>
    </section>
  );
}

/* ───────────────────────── Footer [S2] ───────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-navy-900/10 bg-white pt-12 pb-36 sm:pb-12">
      <Container className="flex flex-col items-center gap-4 text-center text-sm text-muted">
        <Image src={logo} alt="Human Plus Institute" className="h-10 w-auto" />
        <p className="leading-relaxed">
          <strong className="text-navy-900">{company.name}</strong>
          <br />
          {company.address}
          <br />
          {company.phone}
        </p>
        <p className="flex flex-wrap justify-center gap-x-2 gap-y-1">
          {company.links.map((l, i) => (
            <span key={l.href}>
              {i > 0 && <span aria-hidden="true">· </span>}
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-800 underline-offset-4 hover:underline">
                {l.label}
              </a>
            </span>
          ))}
        </p>
      </Container>
    </footer>
  );
}

/* ───────────────────────── Floating ───────────────────────── */

/** Bilah CTA lengket di bawah layar, khusus mobile. */
function MobileCtaBar({ promo }: { promo: LandingPromo | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/95 px-4 py-3 backdrop-blur sm:hidden">
      <MobilePromoStrip promo={promo} />
      <MobilePromoPrice promo={promo} />
      <CtaPair size="sm" placement="mobile-bar" stretch={false} itemClassName="flex-1" className="flex-nowrap" />
    </div>
  );
}

function WhatsAppButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat via WhatsApp"
      className="wa-float fixed right-4 bottom-32 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg ring-4 ring-white transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
