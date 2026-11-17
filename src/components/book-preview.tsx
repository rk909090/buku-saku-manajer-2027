"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { gaEvent } from "@/lib/ga";

/**
 * "Intip isi buku": kartu foto asli halaman buku + jendela pembesar (lightbox).
 * - Ketuk foto / tombol "Perbesar" → ukuran asli (1:1 piksel) yang bisa digeser untuk membaca.
 * - Panah kiri/kanan berpindah gambar, Esc menutup. Di ponsel juga bisa dicubit (pinch).
 */
export type PreviewShot = { src: StaticImageData; alt: string; label: string };
export type PreviewTopic = { id: string; title: string; pages: string; summary: string; shots: PreviewShot[] };

export function BookPreview({ topics }: { topics: PreviewTopic[] }) {
  const flat = topics.flatMap((t) => t.shots.map((s, i) => ({ ...s, topic: t, index: i })));
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const show = (topicIdx: number, el: HTMLElement) => {
    opener.current = el;
    const start = flat.findIndex((f) => f.topic.id === topics[topicIdx].id);
    setOpen(start);
    gaEvent("select_content", { content_type: "book_page_preview", content_id: topics[topicIdx].id });
  };

  return (
    <>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {topics.map((t, i) => (
          <article key={t.id} className="group flex flex-col overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-white/10">
            <button
              type="button"
              onClick={(e) => show(i, e.currentTarget)}
              className="relative block aspect-[4/3] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
              aria-label={`Perbesar foto halaman ${t.pages}: ${t.title}`}
            >
              <Image
                src={t.shots[0].src}
                alt={t.shots[0].alt}
                placeholder="blur"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 300px"
                className="size-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-950/80 to-transparent" aria-hidden="true" />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-navy-900 shadow">
                <ZoomIcon className="size-3.5" /> Perbesar &amp; baca
              </span>
            </button>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs font-bold tracking-wider text-gold-300 uppercase">{t.pages}</p>
              <h3 className="mt-1.5 font-display text-xl leading-tight font-bold text-white">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{t.summary}</p>
            </div>
          </article>
        ))}
      </div>
      {open != null && (
        <Lightbox
          items={flat}
          index={open}
          setIndex={setOpen}
          onClose={() => {
            setOpen(null);
            opener.current?.focus();
          }}
        />
      )}
    </>
  );
}

type FlatShot = PreviewShot & { topic: PreviewTopic; index: number };

function Lightbox({ items, index, setIndex, onClose }: { items: FlatShot[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const item = items[index];
  const [zoom, setZoom] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const focusPoint = useRef<{ x: number; y: number } | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const go = useCallback(
    (d: number) => {
      setZoom(false);
      setIndex((index + d + items.length) % items.length);
    },
    [index, items.length, setIndex]
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Setelah diperbesar, gulir agar titik yang diketuk berada di tengah layar.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (zoom && focusPoint.current) {
      el.scrollLeft = focusPoint.current.x * el.scrollWidth - el.clientWidth / 2;
      el.scrollTop = focusPoint.current.y * el.scrollHeight - el.clientHeight / 2;
    } else {
      el.scrollTo(0, 0);
    }
  }, [zoom, index]);

  const toggleZoom = (e?: React.MouseEvent<HTMLElement>) => {
    if (!zoom && e) {
      const r = e.currentTarget.getBoundingClientRect();
      focusPoint.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    } else if (!zoom) {
      focusPoint.current = { x: 0.3, y: 0.22 }; // area teks halaman kiri, bukan lipatan tengah
    }
    setZoom((z) => !z);
  };

  const sameTopic = items.filter((i) => i.topic.id === item.topic.id);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-navy-950 text-white" role="dialog" aria-modal="true" aria-label={`${item.topic.title} — ${item.label}`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold">{item.topic.title}</p>
          <p className="truncate text-xs text-white/60">
            {item.label} · foto asli buku · {index + 1}/{items.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggleZoom()}
          className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold hover:bg-white/20 sm:inline-flex"
        >
          <ZoomIcon className="size-4" /> {zoom ? "Ukuran layar" : "Perbesar"}
        </button>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label="Tutup" className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
      <div ref={scroller} className={`absolute inset-0 ${zoom ? "overflow-auto" : "overflow-hidden"}`}>
        {/* Saat diperbesar: blok selebar gambar (w-max) + mx-auto → rata tengah bila sempit, bisa digulir penuh bila lebar. */}
        <div className={zoom ? "min-h-full w-max min-w-full" : "flex min-h-full items-center justify-center p-3 sm:p-6"}>
          <Image
            key={item.src.src}
            src={item.src}
            alt={item.alt}
            placeholder="blur"
            quality={85}
            sizes="100vw"
            onClick={toggleZoom}
            className={zoom ? "mx-auto block max-w-none cursor-zoom-out" : "h-auto max-h-[calc(100dvh-10rem)] w-auto max-w-full cursor-zoom-in rounded-lg object-contain shadow-2xl"}
            style={zoom ? { width: item.src.width, height: "auto" } : undefined}
          />
        </div>
      </div>
        {/* Panah di luar area gulir agar posisinya tetap saat foto diperbesar & digeser. */}
        <button type="button" onClick={() => go(-1)} aria-label="Gambar sebelumnya" className="absolute top-1/2 left-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-navy-950/70 ring-1 ring-white/15 hover:bg-navy-900 sm:left-4">
          <Chevron dir="left" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Gambar berikutnya" className="absolute top-1/2 right-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-navy-950/70 ring-1 ring-white/15 hover:bg-navy-900 sm:right-4">
          <Chevron dir="right" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-white/60 sm:px-6">
        <div className="flex gap-2">
          {sameTopic.map((s) => {
            const i = items.indexOf(s);
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setZoom(false);
                  setIndex(i);
                }}
                className={`rounded-full px-3 py-1.5 font-semibold ${i === index ? "bg-gold-500 text-navy-950" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="hidden sm:block">Ketuk foto untuk {zoom ? "kembali" : "memperbesar"} · ← → pindah · Esc tutup</p>
        <button type="button" onClick={() => toggleZoom()} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white sm:hidden">
          {zoom ? "Ukuran layar" : "Perbesar"}
        </button>
      </div>
    </div>
  );
}

function ZoomIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
