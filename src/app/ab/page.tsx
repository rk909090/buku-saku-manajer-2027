import type { Metadata } from "next";
import { headlineVariants } from "@/lib/content";
import { AB_COOKIE, AB_EXPERIMENT, AB_QUERY_PARAM } from "@/lib/ab-config";

export const metadata: Metadata = {
  title: "Pratinjau A/B Headline — Buku Saku Manajer",
  robots: { index: false, follow: false },
};

/** Halaman internal untuk melihat & membandingkan semua varian headline. */
export default function AbPreviewPage() {
  return (
    <main className="min-h-dvh bg-cream px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold tracking-wide text-gold-700 uppercase">Internal · tidak diindeks</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-navy-900">Pratinjau A/B Headline Hero</h1>
        <p className="mt-4 leading-relaxed text-ink/80">
          Eksperimen <code className="rounded bg-white px-1.5 py-0.5 text-sm">{AB_EXPERIMENT}</code>. Pengunjung{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">/</code> dibagi acak dengan bobot sama ke{" "}
          {headlineVariants.length} varian, dan variannya disimpan di cookie{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-sm">{AB_COOKIE}</code> selama 30 hari. Hanya kicker dan
          headline yang berbeda; isi halaman lainnya sama.
        </p>
        <p className="mt-3 rounded-xl border border-gold-500/40 bg-white p-4 text-sm leading-relaxed text-ink/80">
          <strong className="text-navy-900">Pencatatan:</strong> tayangan headline dan klik CTA disimpan ke tabel MySQL{" "}
          <code>ab_events</code>. Ringkasan hasil ada di <code>/api/ab/stats</code> (butuh token). Tautan pratinjau di
          bawah memakai <code>?{AB_QUERY_PARAM}=</code>: cookie varian tidak berubah, dan event-nya ditandai{" "}
          <code>forced</code> sehingga tidak ikut dihitung di hasil.
        </p>

        <ol className="mt-10 space-y-6">
          {headlineVariants.map((v) => (
            <li key={v.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-navy-900/10">
              <div className="hero-bg px-6 py-8 text-white sm:px-8">
                <p className="font-display text-lg font-semibold text-gold-300">{v.kicker}</p>
                <p className="mt-2 font-display text-3xl leading-tight font-bold sm:text-4xl">
                  {v.headline[0]} <span className="gold-text">{v.headline[1]}</span>
                </p>
              </div>
              <div className="space-y-2 px-6 py-5 text-sm leading-relaxed text-ink/80 sm:px-8">
                <p className="font-display text-xl font-bold text-navy-900">
                  Varian {v.id.toUpperCase()} — {v.name}
                </p>
                <p>
                  <strong className="text-navy-900">Hipotesis:</strong> {v.hypothesis}
                </p>
                <p>
                  <strong className="text-navy-900">Dasar materi:</strong> {v.basis}
                </p>
                <a
                  href={`/?${AB_QUERY_PARAM}=${v.id}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-2 inline-flex rounded-full bg-navy-900 px-4 py-2 font-semibold text-white hover:bg-navy-800"
                >
                  Lihat halaman dengan varian {v.id.toUpperCase()} ↗
                </a>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
