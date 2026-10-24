import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionTitle } from "../components/products/CuratedCollection";
import { Breadcrumbs, Reveal } from "../components/ui";
import { CRAFT_STORIES, FABRICS, IMG, TECHNIQUE_GROUP, img } from "../data/catalogue";
import type { FabricFamily, Technique, TechniqueGroup } from "../types";
import { cn } from "../utils/cn";

/* Simple weave-structure diagrams (educational schematics, not to scale). */
function IkatDiagram() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-full" role="img" aria-label="Diagram: yarns tie-dyed before weaving">
      {[20, 45, 70, 95, 120, 145].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={10} x2={x} y2={110} stroke={i % 2 ? "#C46A4B" : "#683B2B"} strokeWidth={7} />
          {[35, 60, 85].map((y) => <rect key={y} x={x - 5} y={y} width={10} height={8} fill="#F8EFEB" />)}
        </g>
      ))}
      <line x1={8} y1={60} x2={192} y2={60} stroke="#D4A373" strokeWidth={2} strokeDasharray="4 3" />
      <text x={100} y={118} textAnchor="middle" fontSize={9} fill="#8A7164">warp dyed first → woven after</text>
    </svg>
  );
}

function JamdaniDiagram() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-full" role="img" aria-label="Diagram: supplementary weft motifs float on the base weave">
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={10} y1={12 + i * 8} x2={190} y2={12 + i * 8} stroke="#B88A70" strokeWidth={2.5} />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <line key={i} x1={14 + i * 11} y1={8} x2={14 + i * 11} y2={112} stroke="#683B2B" strokeWidth={1.4} opacity={0.55} />
      ))}
      <ellipse cx={100} cy={60} rx={34} ry={22} fill="none" stroke="#C46A4B" strokeWidth={3} />
      <text x={100} y={118} textAnchor="middle" fontSize={9} fill="#8A7164">motifs inserted by hand as extra weft</text>
    </svg>
  );
}

function BrocadeDiagram() {
  return (
    <svg viewBox="0 0 200 120" className="h-28 w-full" role="img" aria-label="Diagram: raised zari motifs sit above the base cloth">
      <rect x={10} y={70} width={180} height={34} fill="#E6DAD3" />
      {Array.from({ length: 18 }, (_, i) => (
        <line key={i} x1={14 + i * 10} y1={70} x2={14 + i * 10} y2={104} stroke="#B88A70" strokeWidth={1.6} />
      ))}
      {[50, 100, 150].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={58} rx={20} ry={12} fill="none" stroke="#D4A373" strokeWidth={3} />
          <ellipse cx={x} cy={58} rx={9} ry={5} fill="none" stroke="#C46A4B" strokeWidth={2} />
        </g>
      ))}
      <text x={100} y={118} textAnchor="middle" fontSize={9} fill="#8A7164">extra zari weft builds raised motifs</text>
    </svg>
  );
}

const WEAVE_DEEP_DIVES: { technique: Technique; title: string; body: string[]; diagram: () => React.JSX.Element; shopTo: string }[] = [
  {
    technique: "Ikat", title: "Ikat — dyed before woven",
    body: [
      "In ikat, bundles of yarn are tied and dyed before they ever reach the loom, so the pattern lives inside the thread itself.",
      "Single ikat dyes either the warp or the weft (Pochampally, Sambalpuri). Double ikat dyes both and aligns them on the loom (Patan Patola) — far rarer and slower.",
    ],
    diagram: IkatDiagram, shopTo: "/shop?weave=Ikat",
  },
  {
    technique: "Jamdani", title: "Jamdani — motifs that float",
    body: [
      "Jamdani motifs are inserted by hand as a supplementary weft while the cloth is woven, so they appear to float on fine cotton.",
      "Because each motif is counted and placed manually, no two jamdani sarees are ever exactly alike.",
    ],
    diagram: JamdaniDiagram, shopTo: "/shop?weave=Jamdani",
  },
  {
    technique: "Brocade", title: "Brocade — woven gold",
    body: [
      "Brocade uses extra weft threads — often zari — to build raised motifs into the fabric as it is woven.",
      "Banarasi kadhua brocade weaves each motif separately; Tanchoi uses a satin weave with self-coloured patterns instead of metal thread.",
    ],
    diagram: BrocadeDiagram, shopTo: "/shop?weave=Brocade",
  },
];

const FABRIC_NOTES: Record<FabricFamily, { virtue: string; watch: string }> = {
  Silk: { virtue: "Lustrous, strong, drapes beautifully.", watch: "Needs dry cleaning; keep away from prolonged sun." },
  Cotton: { virtue: "Breathable, easy, everyday.", watch: "Wrinkles; pre-shrunk pieces hold shape better." },
  "Silk-Cotton": { virtue: "Sheen of silk, ease of cotton.", watch: "Check the blend ratio — ours is stated per product." },
  Linen: { virtue: "Crisp, cool, modern.", watch: "Softens with wash; embrace the crease." },
  Organza: { virtue: "Sheer and structured.", watch: "Snags easily; handle gently." },
  Chiffon: { virtue: "Light and fluid.", watch: "Confirm silk vs synthetic — we label both." },
  Georgette: { virtue: "Grainy, flowing, embroidery-friendly.", watch: "Usually synthetic in this price band; labelled." },
  Crepe: { virtue: "Matte with a soft fall.", watch: "Mysore crepe silk is the premium benchmark." },
  Tussar: { virtue: "Wild silk, golden, textured.", watch: "Natural slubs are the signature, not flaws." },
  Muga: { virtue: "Naturally golden, very durable.", watch: "Rare — verify the source." },
  Eri: { virtue: "Matte, warm 'peace silk'.", watch: "Less sheen than mulberry silk." },
  Khadi: { virtue: "Hand-spun, hand-woven.", watch: "Slight irregularity proves the hand." },
  Tissue: { virtue: "Luminous metallic finish.", watch: "Dry clean only; fold in muslin." },
  Blended: { virtue: "Easy-care and affordable.", watch: "Composition is always stated — read it." },
};

export default function GuidePage() {
  const byGroup = (g: TechniqueGroup) =>
    (Object.keys(TECHNIQUE_GROUP) as Technique[]).filter((t) => TECHNIQUE_GROUP[t] === g);

  return (
    <div>
      <section className="border-b border-sand bg-ivory">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 lg:grid-cols-2 lg:px-6">
          <div>
            <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Fabric & Weaving Guide" }]} />
            <p className="eyebrow">Learn the Craft</p>
            <h1 className="mt-2 font-display text-4xl text-darkroast md:text-5xl">Fabric & Weaving Guide</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-warmgray md:text-[15px]">
              Fabric is <em>what</em> a saree is made of. Weave is <em>how</em> pattern is built on the loom. Printing, dyeing and embroidery happen <em>after</em> weaving. Keep those three apart and no seller can confuse you again.
            </p>
          </div>
          <img src={img(IMG.goldFabric, 800, 520)} alt="Close-up of golden silk textile folds" loading="lazy" className="aspect-[16/10] w-full rounded-card object-cover" />
        </div>
      </section>

      {/* Fabrics */}
      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-6">
        <SectionTitle title="Fabric Categories" subtitle="What the saree is made of — composition is stated on every product page." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FABRICS.map((f, i) => (
            <Reveal key={f.name} delay={(i % 4) * 0.04}>
              <article className="flex h-full flex-col border border-sand bg-ivory">
                <img src={f.image} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-xl text-espresso">{f.name}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-warmgray">{f.note}</p>
                  <p className="mt-2 text-xs text-olivesage">✓ {FABRIC_NOTES[f.name].virtue}</p>
                  <p className="text-xs text-terracotta">! {FABRIC_NOTES[f.name].watch}</p>
                  <Link to={`/shop?fabric=${encodeURIComponent(f.name)}`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta">
                    Shop {f.name} <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 grid gap-3 border border-sand bg-ivory p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Pure", "100% of the named fibre."],
            ["Blend", "Two or more fibres, ratio stated when known."],
            ["Natural Fibre", "Cotton, linen, khadi — plant-based."],
            ["Art Silk / Synthetic", "Silk-like look, man-made fibre — never sold as pure silk."],
          ].map(([k, v]) => (
            <Link key={k} to={`/shop?composition=${encodeURIComponent(k)}`} className="group">
              <p className="font-display text-lg text-espresso group-hover:underline">{k}</p>
              <p className="text-xs text-warmgray">{v}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Weaving deep dives */}
      <section className="bg-cream py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <SectionTitle title="Weaving Traditions" subtitle="Patterns built into the cloth itself, on the loom." />
          <div className="grid gap-6 lg:grid-cols-3">
            {WEAVE_DEEP_DIVES.map((d) => (
              <Reveal key={d.technique}>
                <article className="flex h-full flex-col border border-sand bg-ivory p-6">
                  <span className="w-fit bg-olivesage px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ivory">Weave · verified technique</span>
                  <h2 className="mt-3 font-display text-2xl text-darkroast">{d.title}</h2>
                  <div className="my-4 border border-sand bg-cream/60 p-3"><d.diagram /></div>
                  {d.body.map((p, i) => <p key={i} className="mb-2 text-[13px] leading-relaxed text-warmgray">{p}</p>)}
                  <Link to={d.shopTo} className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta">
                    Shop {d.technique} <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["Tanchoi", "Butidar", "Zari Work", "Temple Border", "Handloom", "Double Ikat"] as Technique[]).map((t) => (
              <Link key={t} to={`/shop?weave=${encodeURIComponent(t)}`} className="border border-sand bg-ivory px-3.5 py-2 text-xs hover:border-espresso">{t}</Link>
            ))}
            <Link to="/techniques" className="border border-espresso bg-espresso px-3.5 py-2 text-xs text-cream">All techniques →</Link>
          </div>
        </div>
      </section>

      {/* Surface techniques */}
      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-6">
        <SectionTitle title="Surface Techniques" subtitle="Applied to woven cloth — dyeing, printing and embroidery happen after weaving." />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border border-sand bg-ivory p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">Printing & Dyeing</p>
            <div className="mt-3 space-y-3">
              {byGroup("Print & Dye").map((t) => (
                <div key={t} className="flex items-start justify-between gap-3 border-b border-sand/70 pb-3 last:border-0">
                  <div>
                    <p className="font-display text-lg text-darkroast">{t}</p>
                    <p className="text-xs text-warmgray">{t === "Bandhani" || t === "Leheriya" || t === "Tie-Dye" ? "Resist-dyeing: tied, then dyed." : t === "Block Print" ? "Hand-carved blocks pressed onto cloth (Bagru, Sanganeri, Dabu, Ajrakh)." : t === "Kalamkari" ? "Hand-drawn with a pen using natural dyes." : t === "Batik" ? "Wax-resist dyeing." : "Hand-applied colour work."}</p>
                  </div>
                  <Link to={`/shop?print=${encodeURIComponent(t)}`} className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-espresso hover:text-terracotta">Shop →</Link>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-sand bg-ivory p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mocha">Embroidery & Surface</p>
            <div className="mt-3 space-y-3">
              {byGroup("Embroidery & Surface").map((t) => (
                <div key={t} className="flex items-start justify-between gap-3 border-b border-sand/70 pb-3 last:border-0">
                  <div>
                    <p className="font-display text-lg text-darkroast">{t}</p>
                    <p className="text-xs text-warmgray">{t === "Chikankari" ? "Fine white-work from Lucknow." : t === "Gota Patti" ? "Metallic ribbon appliqué." : t === "Zardozi" ? "Metal-wire embroidery." : t === "Kantha" ? "Running-stitch layering." : t === "Phulkari" ? "Flower-work from Punjab." : t === "Mirror Work" ? "Shisha mirrors couched onto cloth." : "Needlework added after weaving."}</p>
                  </div>
                  <Link to={`/shop?embellishment=${encodeURIComponent(t)}`} className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-espresso hover:text-terracotta">Shop →</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CRAFT_STORIES.slice(0, 3).map((c) => (
            <Link key={c.slug} to={`/stories#${c.slug}`} className="group relative overflow-hidden rounded-card">
              <img src={c.image} alt={c.title} loading="lazy" className={cn("aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105")} />
              <div className="absolute inset-0 bg-gradient-to-t from-darkroast/80 to-transparent" />
              <p className="absolute bottom-3 left-4 font-display text-xl text-ivory">{c.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
