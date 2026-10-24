import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/** Mughal cusped-arch silhouette in objectBoundingBox units (0–1). */
const ARCH =
  "M0,1 L0,0.3 Q0,0.22 0.06,0.2 Q0.1,0.19 0.12,0.15 C0.2,0.05 0.38,0.03 0.5,0 C0.62,0.03 0.8,0.05 0.88,0.15 Q0.9,0.19 0.94,0.2 Q1,0.22 1,0.3 L1,0.86 Q1,0.9 0.96,0.92 C0.8,0.98 0.65,1 0.5,1 C0.35,1 0.2,0.98 0.04,0.92 Q0,0.9 0,0.86 Z";
const ARCH_100 = ARCH.replace(/[\d.]+/g, (n) => String(parseFloat(n) * 100));

export function SectionTitle({ title, subtitle, light }: { title: string; subtitle?: string; light?: boolean }) {
  return (
    <div className="mb-8 md:mb-10">
      <h2 className={`inline-block border-b-2 pb-1.5 font-display text-3xl md:text-[2.5rem] ${light ? "border-gold text-ivory" : "border-espresso text-espresso"}`}>
        {title}
      </h2>
      {subtitle && <p className={`mt-3 text-sm ${light ? "text-champagne" : "text-warmgray"}`}>{subtitle}</p>}
    </div>
  );
}

function Laurel() {
  const leaves = [10, 20, 30, 40, 50];
  return (
    <svg viewBox="0 0 120 14" className="mx-auto mt-1.5 h-3 w-24 text-champagne" aria-hidden>
      <path d="M56 9 C40 9 22 7 4 3" stroke="currentColor" strokeWidth="0.8" fill="none" />
      <path d="M64 9 C80 9 98 7 116 3" stroke="currentColor" strokeWidth="0.8" fill="none" />
      {leaves.map((x) => (
        <g key={x} fill="currentColor">
          <ellipse cx={56 - x} cy={9 - x * 0.1} rx="3.2" ry="1.2" transform={`rotate(-18 ${56 - x} ${9 - x * 0.1})`} />
          <ellipse cx={64 + x} cy={9 - x * 0.1} rx="3.2" ry="1.2" transform={`rotate(18 ${64 + x} ${9 - x * 0.1})`} />
        </g>
      ))}
      <circle cx="60" cy="9" r="1.6" fill="currentColor" />
    </svg>
  );
}

export interface ArchItem { title: string; caption: string; image: string; to: string }

export default function CuratedCollection({ items, title = "Curated Collection", subtitle, viewAllTo }: { items: ArchItem[]; title?: string; subtitle?: string; viewAllTo?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [thumb, setThumb] = useState(0.3);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setThumb(Math.min(1, el.clientWidth / el.scrollWidth));
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const scrollBy = (dir: number) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: "smooth" });
  };

  const jumpTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.scrollTo({ left: ratio * (el.scrollWidth - el.clientWidth), behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-paper" aria-labelledby="curated-heading">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id="arch-clip" clipPathUnits="objectBoundingBox">
            <path d={ARCH} />
          </clipPath>
        </defs>
      </svg>

      <div className="pattern-band" aria-hidden />

      <div className="mx-auto max-w-7xl px-4 py-14 md:py-16 lg:px-6">
        <div className="flex items-end justify-between gap-4">
          <div id="curated-heading"><SectionTitle title={title} subtitle={subtitle} /></div>
          <div className="mb-10 hidden items-center gap-2 md:flex">
            {viewAllTo && <Link to={viewAllTo} className="mr-3 text-xs font-semibold uppercase tracking-[0.16em] text-espresso underline-offset-4 hover:underline">View all</Link>}
            <button onClick={() => scrollBy(-1)} aria-label="Previous collections" className="flex h-11 w-11 items-center justify-center rounded-full border border-latte text-espresso transition-colors hover:bg-espresso hover:text-cream">
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <button onClick={() => scrollBy(1)} aria-label="Next collections" className="flex h-11 w-11 items-center justify-center rounded-full border border-latte text-espresso transition-colors hover:bg-espresso hover:text-cream">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          onScroll={measure}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-8 md:px-0"
          tabIndex={0}
          role="region"
          aria-label="Curated collections — scroll horizontally"
        >
          {items.map((c) => {
            const [first, ...rest] = c.title.split(" ");
            return (
              <Link key={c.title} to={c.to} className="group w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-8rem)/5)]">
                <div className="relative aspect-[4/5] w-full drop-shadow-[0_10px_18px_rgba(48,35,31,0.22)] transition-transform duration-500 group-hover:-translate-y-1.5">
                  <div className="absolute inset-0" style={{ clipPath: "url(#arch-clip)" }}>
                    <img src={c.image} alt={`${c.caption} collection`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/35 to-transparent" />
                  </div>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    <path d={ARCH_100} transform="translate(5 4) scale(0.9 0.92)" fill="none" stroke="#FDF9F6" strokeOpacity="0.85" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="absolute inset-x-0 bottom-[11%] px-3 text-center">
                    <p className="font-display text-[15px] uppercase leading-tight tracking-[0.08em] text-ivory sm:text-lg">
                      {first}<br />{rest.join(" ")}
                    </p>
                    <Laurel />
                  </div>
                </div>
                <p className="mt-3 text-center text-sm text-warmgray transition-colors group-hover:text-espresso">{c.caption}</p>
              </Link>
            );
          })}
        </div>

        {viewAllTo && <Link to={viewAllTo} className="mt-6 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-espresso underline underline-offset-4 md:hidden">View all saree types</Link>}
        <div
          className="relative mt-8 h-[3px] w-full cursor-pointer bg-white"
          onClick={jumpTo}
          role="presentation"
        >
          <div
            className="absolute inset-y-0 bg-espresso transition-[left] duration-150"
            style={{ width: `${thumb * 100}%`, left: `${progress * (1 - thumb) * 100}%` }}
          />
        </div>
      </div>

      <div className="pattern-band" aria-hidden />
    </section>
  );
}