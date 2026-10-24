import { Link } from "react-router-dom";
import { Reveal } from "../ui";
import { SectionTitle } from "./CuratedCollection";

export interface OccasionItem { title: string; caption?: string; image: string; to: string; pos?: string }

function OccasionTile({ o, tall }: { o: OccasionItem; tall?: boolean }) {
  return (
    <Link to={o.to} className="group relative block overflow-hidden bg-sand" aria-label={`Shop ${o.title}`}>
      <div className={tall ? "aspect-[4/4.4]" : "aspect-[16/10]"}>
        <img src={o.image} alt="" loading="lazy" style={{ objectPosition: o.pos }} className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-ivory/95 via-ivory/55 to-transparent to-[70%]" />
      <div className="pointer-events-none absolute inset-2.5 border border-ivory/70 transition-colors group-hover:border-gold" aria-hidden />
      <div className="absolute inset-x-0 top-0 flex flex-col items-center px-4 pt-[8%] text-center">
        <h3 className="font-display text-lg uppercase leading-tight tracking-[0.04em] text-espresso sm:text-xl lg:text-[1.45rem]">{o.title}</h3>
        <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.45em] text-darkroast">Collections</p>
        {o.caption && <p className="mt-1.5 hidden max-w-[16rem] text-[11px] text-warmgray sm:block">{o.caption}</p>}
        <span className="mt-3 bg-espresso px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream transition-colors group-hover:bg-terracotta">Shop now</span>
      </div>
    </Link>
  );
}

export default function OccasionGrid({ items, title = "Shop by Occasion", subtitle = "Styled for every moment" }: { items: OccasionItem[]; title?: string; subtitle?: string }) {
  const top = items.slice(0, 3);
  const bottom = items.slice(3);
  return (
    <section className="bg-cream py-16 md:py-20" aria-label={title}>
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <SectionTitle title={title} subtitle={subtitle} />
        <div className="grid gap-3 sm:grid-cols-3">
          {top.map((o, i) => <Reveal key={o.title} delay={i * 0.06}><OccasionTile o={o} /></Reveal>)}
        </div>
        {bottom.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {bottom.map((o, i) => <Reveal key={o.title} delay={i * 0.05}><OccasionTile o={o} tall /></Reveal>)}
          </div>
        )}
      </div>
    </section>
  );
}
