import { ArrowRight, BadgeCheck, Landmark, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SectionTitle } from "../components/products/CuratedCollection";
import { Breadcrumbs, Reveal } from "../components/ui";
import { FABRICS, OCCASION_INFO, OFFICIAL_ZONES, REGIONS, TECHNIQUE_GROUP, VARIETIES, ZONES } from "../data/catalogue";
import { productService } from "../services";
import type { GarmentKind, Technique, TechniqueGroup, Zone } from "../types";
import { cn } from "../utils/cn";

function PageHeader({ eyebrow, title, text, crumb }: { eyebrow: string; title: string; text: string; crumb: string }) {
  return (
    <section className="border-b border-sand bg-ivory">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 lg:px-6">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: crumb }]} />
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl text-darkroast md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-warmgray">{text}</p>
      </div>
    </section>
  );
}

const count = (pred: Parameters<typeof productService.countFor>[0]) => productService.countFor(pred);

/* --------------------------------- Regions --------------------------------- */

export function RegionsPage() {
  const [zone, setZone] = useState<Zone | "All">("All");
  const zones = zone === "All" ? ZONES : [zone];
  return (
    <div>
      <PageHeader crumb="Shop by Region" eyebrow="An Atlas of Weaving" title="Shop by Region" text="Every state and country in our catalogue, with its signature traditions. Counts show demo pieces currently listed; traditions without listings are still catalogued." />
      <div className="sticky top-[118px] z-20 border-b border-sand bg-cream/95 backdrop-blur lg:top-[150px]">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 lg:px-6">
          {(["All", ...ZONES] as const).map((z) => (
            <button key={z} onClick={() => setZone(z)} aria-pressed={zone === z} className={cn("shrink-0 border px-3 py-1.5 text-xs", zone === z ? "border-espresso bg-espresso text-cream" : "border-sand bg-white text-warmgray")}>{z}</button>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        {zones.map((z) => {
          const regions = REGIONS.filter((r) => r.zone === z);
          if (!regions.length) return null;
          return (
            <section key={z} className="mb-14" id={z.replace(/\s/g, "-").toLowerCase()}>
              <SectionTitle title={z} subtitle={z === "Southeast Asia" ? "Related draping traditions — distinct garments, not sarees." : undefined} />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {regions.map((r, i) => {
                  const vs = VARIETIES.filter((v) => v.state === r.name);
                  const n = count((p) => p.state === r.name);
                  return (
                    <Reveal key={r.name} delay={(i % 3) * 0.05}>
                      <article className="flex h-full flex-col overflow-hidden border border-sand bg-ivory">
                        <Link to={`/shop?state=${encodeURIComponent(r.name)}`} className="group relative block">
                          <img src={r.image} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-darkroast/80 to-transparent" />
                          <div className="absolute bottom-0 p-4">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-gold">{r.country !== "India" ? r.country : r.zone}</p>
                            <h3 className="font-display text-2xl text-ivory">{r.name}</h3>
                          </div>
                        </Link>
                        <div className="flex flex-1 flex-col p-5">
                          <p className="font-display text-lg text-espresso">{r.tradition}</p>
                          <p className="mt-1 text-xs leading-relaxed text-warmgray">{r.story}</p>
                          <ul className="mt-4 flex flex-wrap gap-1.5">
                            {vs.slice(0, 8).map((v) => (
                              <li key={v.slug}>
                                <Link to={`/shop?variety=${encodeURIComponent(v.name)}`} className={cn("inline-block border px-2 py-0.5 text-[11px] hover:border-espresso", v.status === "inspired" ? "border-gold/50 italic text-mutedbrown" : "border-sand text-darkroast")}>{v.name}</Link>
                              </li>
                            ))}
                            {vs.length > 8 && <li className="px-1 text-[11px] text-mutedbrown">+{vs.length - 8} more</li>}
                          </ul>
                          <Link to={`/shop?state=${encodeURIComponent(r.name)}`} className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta">
                            {n > 0 ? `Shop ${n} piece${n === 1 ? "" : "s"}` : "View traditions"} <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        </div>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </section>
          );
        })}
        <p className="text-xs text-mutedbrown"><span className="italic">Italic</span> traditions are contemporary adaptations or inspirations rather than separately recognised saree varieties.</p>
      </div>
    </div>
  );
}

/* --------------------------------- Fabrics --------------------------------- */

export function FabricsPage() {
  return (
    <div>
      <PageHeader crumb="Shop by Fabric" eyebrow="Fabric Guide" title="Shop by Fabric" text="Fabric descriptions reflect actual material composition. Art silk is never listed as pure silk, and blends are always named as blends." />
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Pure", "100% of the named fibre, e.g. pure mulberry silk."],
            ["Blend", "Two or more fibres, e.g. silk-cotton. Ratio stated when known."],
            ["Natural Fibre", "Cotton, linen, khadi — plant-based fibres."],
            ["Art Silk / Synthetic", "Viscose, polyester or other man-made fibres with a silk-like look."],
          ].map(([k, v]) => (
            <Link key={k} to={`/shop?composition=${encodeURIComponent(k)}`} className="border border-sand bg-ivory p-4 hover:border-espresso">
              <p className="font-display text-lg text-espresso">{k}</p>
              <p className="mt-1 text-xs text-warmgray">{v}</p>
              <p className="mt-2 text-[11px] text-mutedbrown">{count((p) => p.composition === k)} pieces</p>
            </Link>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FABRICS.map((f, i) => (
            <Reveal key={f.name} delay={(i % 4) * 0.05}>
              <Link to={`/shop?fabric=${encodeURIComponent(f.name)}`} className="group block border border-sand bg-ivory">
                <div className="overflow-hidden"><img src={f.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" /></div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-xl text-darkroast">{f.name}</h2>
                    <span className="text-[11px] text-mutedbrown">{count((p) => p.fabric === f.name)} pieces</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-warmgray">{f.note}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3 text-xs">
          <Link to="/shop?loom=Handloom" className="border border-olivesage/50 bg-olivesage/10 px-4 py-2 text-olivesage">Handloom only ({count((p) => p.loom === "Handloom")})</Link>
          <Link to="/shop?loom=Powerloom" className="border border-sand px-4 py-2">Powerloom ({count((p) => p.loom === "Powerloom")})</Link>
          <Link to="/shop?loom=Machine-woven" className="border border-sand px-4 py-2">Machine-woven ({count((p) => p.loom === "Machine-woven")})</Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Techniques ------------------------------- */

const GROUP_INFO: Record<TechniqueGroup, { key: string; text: string }> = {
  Weave: { key: "weave", text: "Patterns created on the loom itself — inseparable from the fabric." },
  "Print & Dye": { key: "print", text: "Colour and pattern applied to woven cloth by resist, block, brush or pen." },
  "Embroidery & Surface": { key: "embellishment", text: "Needlework and embellishment added after weaving." },
};

export function TechniquesPage() {
  return (
    <div>
      <PageHeader crumb="Shop by Technique" eyebrow="Weave · Print · Embroider" title="Shop by Weaving Technique" text="A saree can combine several techniques, so products carry multiple technique tags. We keep weaving separate from printing, dyeing and embroidery." />
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        {(Object.keys(GROUP_INFO) as TechniqueGroup[]).map((g) => {
          const techs = (Object.keys(TECHNIQUE_GROUP) as Technique[]).filter((t) => TECHNIQUE_GROUP[t] === g);
          return (
            <section key={g} className="mb-12">
              <SectionTitle title={g === "Weave" ? "Weaving Techniques" : g === "Print & Dye" ? "Printing & Dyeing" : "Embroidery & Surface"} subtitle={GROUP_INFO[g].text} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {techs.map((t) => {
                  const n = count((p) => p.techniques.includes(t));
                  const vs = VARIETIES.filter((v) => v.techniques.includes(t)).length;
                  return (
                    <Link key={t} to={`/shop?${GROUP_INFO[g].key}=${encodeURIComponent(t)}`} className="group border border-sand bg-ivory p-4 transition-colors hover:border-espresso">
                      <p className="font-display text-lg text-darkroast group-hover:text-espresso">{t}</p>
                      <p className="mt-1 text-[11px] text-mutedbrown">{vs} traditions · {n} pieces</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
        <Link to="/stories" className="inline-flex items-center gap-2 bg-espresso px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-cream hover:bg-mocha">Read the craft stories <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      </div>
    </div>
  );
}

/* --------------------------------- Occasions -------------------------------- */

export function OccasionsPage() {
  return (
    <div>
      <PageHeader crumb="Shop by Occasion" eyebrow="Styled for Every Moment" title="Shop by Occasion" text="From bridal heirlooms to breathable summer cottons — curated suggestions for every celebration, ceremony and ordinary day." />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
        {OCCASION_INFO.map((o, i) => (
          <Reveal key={o.key} delay={(i % 3) * 0.05}>
            <Link to={`/shop?occasion=${o.key}`} className="group relative block overflow-hidden">
              <img src={o.image} alt="" loading="lazy" style={{ objectPosition: o.pos }} className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-darkroast/85 via-darkroast/20 to-transparent" />
              <div className="absolute bottom-0 p-5">
                <h2 className="font-display text-2xl text-ivory">{o.label}</h2>
                <p className="mt-1 text-xs text-champagne">{o.caption}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-gold">{count((p) => p.occasion.includes(o.key))} pieces →</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Collections ------------------------------- */

const CURATED = [
  { label: "Bestsellers", text: "Most-loved pieces" }, { label: "New Arrivals", text: "Fresh off the loom" },
  { label: "On Sale", text: "Verified price drops" }, { label: "Premium", text: "Heirloom-grade" },
  { label: "Wedding", text: "Bridal & wedding" }, { label: "Festive", text: "Celebration edit" },
  { label: "Sustainable", text: "Natural dyes & khadi" }, { label: "Origin Verified", text: "Demo verification records" },
  { label: "Designer", text: "Inspired, contemporary" },
];

export function CollectionsPage() {
  const [find, setFind] = useState("");
  const [kind, setKind] = useState<GarmentKind | "All">("All");
  const list = useMemo(() => VARIETIES.filter((v) =>
    (kind === "All" || v.kind === kind) &&
    (!find || [v.name, ...v.aliases, v.state, v.country].join(" ").toLowerCase().includes(find.toLowerCase()))
  ), [find, kind]);
  const groups = ZONES.map((z) => ({ zone: z, items: list.filter((v) => v.zone === z) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHeader crumb="Collections" eyebrow="The Catalogue" title="Collections & Saree Types" text={`Curated edits, plus our catalogue of ${VARIETIES.length} named traditions. This starter list is broad but not exhaustive — new varieties are added as data, without changing the site.`} />
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <SectionTitle title="Curated Collections" />
        <div className="mb-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CURATED.map((c) => (
            <Link key={c.label} to={`/shop?collection=${encodeURIComponent(c.label)}`} className="border border-sand bg-ivory p-4 hover:border-espresso">
              <p className="font-display text-lg text-espresso">{c.label}</p>
              <p className="text-[11px] text-mutedbrown">{c.text}</p>
            </Link>
          ))}
        </div>

        <SectionTitle title="All Saree Types A–Z" subtitle="Sarees, ensembles and related draping traditions — each clearly labelled." />
        <p className="-mt-4 mb-6 flex flex-wrap items-center gap-2 text-xs text-warmgray">
          <span className="inline-flex items-center gap-1.5 border border-olivesage/40 bg-olivesage/10 px-2.5 py-1 text-olivesage">
            <Landmark className="h-3.5 w-3.5" aria-hidden /> {VARIETIES.filter((v) => v.handloomZone).length} varieties covering all 116 listed rows of the official “Pan-India Sarees of Handloom Sectors” compilation
          </span>
          <span>Zones: {OFFICIAL_ZONES.join(" · ")}</span>
        </p>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 border border-sand bg-white px-3 py-2.5 sm:max-w-sm">
            <Search className="h-4 w-4 text-mutedbrown" aria-hidden />
            <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a tradition, state or country…" aria-label="Find a saree type" className="w-full bg-transparent text-sm focus:outline-none" />
          </div>
          {(["All", "Saree", "Ensemble", "Related Drape"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={cn("border px-3 py-2 text-xs", kind === k ? "border-espresso bg-espresso text-cream" : "border-sand bg-white text-warmgray")}>{k}</button>
          ))}
          <span className="text-xs text-mutedbrown">{list.length} shown</span>
        </div>

        {groups.map((g) => (
          <section key={g.zone} id={g.zone.replace(/\s/g, "-").toLowerCase()} className="mb-10">
            <h3 className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-mocha">{g.zone}<span className="h-px flex-1 bg-sand" aria-hidden /></h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...g.items].sort((a, b) => a.name.localeCompare(b.name)).map((v) => {
                const n = count((p) => p.variety === v.name);
                return (
                  <Link key={v.slug} to={`/shop?variety=${encodeURIComponent(v.name)}`} className="group flex flex-col border border-sand bg-ivory p-4 transition-colors hover:border-espresso">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-[17px] leading-snug text-darkroast group-hover:text-espresso">{v.name}</p>
                      <span className="shrink-0 text-[11px] text-mutedbrown">{n ? `${n} listed` : "Catalogued"}</span>
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-mutedbrown">{v.state}{v.country !== "India" && v.state !== v.country ? `, ${v.country}` : ""}</p>
                    <p className="mt-1.5 line-clamp-2 text-xs text-warmgray">{v.blurb}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.status === "established" ? <span className="inline-flex items-center gap-1 text-[10px] text-olivesage"><BadgeCheck className="h-3 w-3" aria-hidden /> Established</span> : <span className="text-[10px] italic text-gold">Contemporary adaptation</span>}
                      {v.kind !== "Saree" && <span className="text-[10px] font-medium text-terracotta">{v.kind} — not a saree</span>}
                      {v.handloomZone && <span className="inline-flex items-center gap-1 text-[10px] text-mocha"><BadgeCheck className="h-3 w-3" aria-hidden /> {v.handloomZone} · official list</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

      </div>
    </div>
  );
}