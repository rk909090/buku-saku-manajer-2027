"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

export type AreaValue = { id: string; name: string; postal_code: string | null };

/**
 * Pencarian kecamatan / kota / kode pos (Biteship Maps lewat /api/shop/areas).
 * Combobox ARIA: panah atas/bawah untuk memilih, Enter untuk memilih, Esc untuk menutup.
 */
export function AreaCombobox({
  value,
  onChange,
  invalid,
  inputClassName,
  placeholder = "Ketik kecamatan, kota, atau kode pos…",
}: {
  value: AreaValue | null;
  onChange: (v: AreaValue | null) => void;
  invalid?: boolean;
  inputClassName: string;
  placeholder?: string;
}) {
  const id = useId();
  const [q, setQ] = useState(value?.name || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<AreaValue[]>([]);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkron dari nilai terpilih (mis. dari localStorage)
    setQ(value?.name || "");
  }, [value?.id, value?.name]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 3 || term === value?.name) return;
    const n = ++reqRef.current;
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(`/api/shop/areas?q=${encodeURIComponent(term)}`);
        const j = await r.json();
        if (n !== reqRef.current) return;
        if (!r.ok) throw new Error(j.error || "Gagal mencari area");
        setItems(j.areas || []);
        setActive(0);
      } catch (e) {
        if (n === reqRef.current) setError((e as Error).message);
      } finally {
        if (n === reqRef.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, open, value?.name]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(a: AreaValue) {
    onChange(a);
    setQ(a.name);
    setOpen(false);
  }

  const listId = `${id}-list`;
  const term = q.trim();
  const visible = term.length >= 3 && term !== value?.name ? items : [];
  const showList = open && (visible.length > 0 || loading || error || term.length >= 3);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          role="combobox"
          aria-expanded={!!showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-activedescendant={showList && visible[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          value={q}
          placeholder={placeholder}
          className={`${inputClassName} pl-10`}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(visible.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && visible[active]) {
              e.preventDefault();
              pick(visible[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted" aria-hidden="true" />}
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-navy-900/10 bg-white p-1.5 shadow-xl"
        >
          {error && <li className="px-3 py-2.5 text-sm text-promo-dark">{error}</li>}
          {!error && !loading && visible.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">Tidak ditemukan. Coba nama kecamatan atau kode pos.</li>
          )}
          {visible.map((a, i) => (
            <li
              key={a.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(a)}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm ${i === active ? "bg-cream" : ""}`}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden="true" />
              <span className="text-ink">{a.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
