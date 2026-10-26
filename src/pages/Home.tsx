import { ArrowRight, Headphones, Lock, MapPin, Quote, RotateCcw, Sparkles, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CuratedCollection, { SectionTitle } from "../components/products/CuratedCollection";
import OccasionGrid from "../components/products/OccasionGrid";
import { ProductGrid } from "../components/products/collections";
import { RateLimitNotice, Reveal } from "../components/ui";
import { CRAFT_STORIES, FABRICS, FEATURED_TYPES, GLOBAL_TRADITIONS, IMG, OCCASION_INFO, STORE_POLICY, TRADITIONS, VARIETIES, img } from "../data/catalogue";
import { HERITAGE_IMAGE, HERO_IMAGE } from "../data/products";
import { inr } from "../lib/format";
import { productService } from "../services";
import { contentService, reviewService } from "../services/catalog";
import { ApiError } from "../services/api";
import type { Product } from "../types";
import { useStore } from "../hooks/useStore";
import { cn } from "../utils/cn";

type Tab = "bestsellers" | "new";

const TESTIMONIALS = [
  { name: "Meera K. · Chennai", stars: 5, quote: "The Kanjivaram arrived folded like a gift — the korvai border is even richer than the photos.", product: "Temple Peacock Kanjivaram", slug: "temple-peacock-kanjivaram", productId: "p001" },
  { name: "Ananya S. · Kolkata", stars: 5, quote: "My Tant Puja saree is featherlight. Customer care helped me pick the right blouse length.", product: "Tant Puja Red-White", slug: "tant-puja-red-white", productId: "p040" },
  { name: "Divya R. · Bengaluru", stars: 4, quote: "The Pochampally ikat geometry is razor sharp. Delivery updates at every step kept me calm.", product: "Pochampally Silk Ikat", slug: "pochampally-silk-ikat", productId: "p020" },
];

export default function Home() {
  const { t } = useStore();
  const home = contentService.home();
  const banners = contentService.banners().filter((b) => b.active);
  const [tab, setTab] = useState<Tab>("bestsellers");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [limited, setLimited] = useState<number | null>(null);

  const load = (t: Tab) => {
    let live = true;
    setLoading(true); setLimited(null);
    productService
      .list(t === "bestsellers" ? { filters: { collection: ["Bestsellers"] }, sort: "popularity", pageSize: 8 } : { sort: "newest", pageSize: 8 })
      .then((r) => { if (live) setItems(r.items); })
      .catch((e) => { if (live && e instanceof ApiError && e.status === 429) setLimited(e.retryAfter ?? 10); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  };
  useEffect(() => load(tab), [tab]);

  const services = [
    STORE_POLICY.freeShippingThreshold && { icon: Truck, title: "Shipping", text: `Free shipping above ${inr(STORE_POLICY.freeShippingThreshold)}; a flat ${inr(STORE_POLICY.flatShipping)} applies below.` },
    STORE_POLICY.returnWindowDays && { icon: RotateCcw, title: "Returns", text: `${STORE_POLICY.returnWindowDays}-day returns on unworn pieces with tags intact.` },
    { icon: Lock, title: "Secure Checkout", text: "No card details are collected until a payment provider is integrated." },
    { icon: MapPin, title: "Order Tracking", text: "Track every order by reference and email, step by step." },
    { icon: Headphones, title: "Care & Support", text: "Product-specific care guides and a human support team." },
  ].filter(Boolean) as { icon: typeof Truck; title: string; text: string }[];

  return (
    <div>
      {/* C — HERO */}
      <section className="relative overflow-hidden bg-ivory">
        <div className="pointer-events-none absolute -left-24 top-16 hidden h-80 w-80 rounded-full bg-champagne/40 blur-3xl lg:block" aria-hidden />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-6 lg:pb-20">
          <Reveal>
            <p className="eyebrow flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" aria-hidden /> {t("hero_eyebrow")}</p>
            <h1 className="mt-4 font-display text-[2.7rem] leading-[1.05] text-darkroast sm:text-6xl lg:text-[4.4rem]">
              {home.heroTitleA}<br />{home.heroTitleB}
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-warmgray">
              {home.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/shop" className="inline-flex items-center gap-2 bg-espresso px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream shadow-card transition-all hover:bg-mocha hover:shadow-lift">
                {t("hero_cta_primary")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/heritage" className="inline-flex items-center gap-2 border-b border-espresso pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-espresso transition-colors hover:border-terracotta hover:text-terracotta">
                {t("hero_cta_secondary")}
              </Link>
            </div>
            <dl className="mt-10 flex gap-8 border-t border-sand pt-6 sm:gap-12">
              {[[`${VARIETIES.length}+`, "Traditions catalogued"], [String(new Set(VARIETIES.map((v) => v.state)).size), "States & countries"], [String(productService.all().length), "Pieces available"]].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl text-espresso">{v}</dd>
                  <dd className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-mutedbrown">{l}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative">
              <div className="overflow-hidden rounded-card shadow-lift">
                <img src={HERO_IMAGE} alt="Portrait of a woman in a traditional silk saree with gold jewellery — licensed stock model photography" className="aspect-[3/4] w-full object-cover md:aspect-[4/4.6]" fetchPriority="high" />
              </div>
              <div className="absolute -bottom-5 -left-4 hidden max-w-[230px] border border-sand bg-ivory p-4 shadow-card sm:block lg:-left-10">
                <p className="text-[10px] uppercase tracking-[0.2em] text-mutedbrown">Tamil Nadu</p>
                <p className="mt-1 font-display text-lg leading-snug text-darkroast">Temple Peacock Kanjivaram</p>
                <Link to="/product/temple-peacock-kanjivaram" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-terracotta hover:underline">
                  Shop the look <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {banners.length > 0 && (
        <section className="border-b border-sand bg-ivory" aria-label="Featured promotions">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 md:grid-cols-2 lg:px-6">
            {banners.map((b) => (
              <Link key={b.id} to={b.to} className="group relative block overflow-hidden rounded-card">
                <img src={b.image} alt="" loading="lazy" className="aspect-[21/9] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-darkroast/80 via-darkroast/30 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center p-6">
                  <p className="font-display text-2xl text-ivory md:text-3xl">{b.title}</p>
                  <p className="mt-1 text-xs text-champagne md:text-sm">{b.subtitle}</p>
                  <span className="mt-3 inline-flex w-fit items-center gap-1.5 bg-ivory px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-espresso">Shop now <ArrowRight className="h-3 w-3" aria-hidden /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* D — EXPLORE BY TRADITION */}
      <section className="bg-cream py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle title="Explore by Tradition" subtitle="Ten regional journeys — each with its own fibre, loom and language of motifs." />
            <Link to="/regions" className="mb-10 hidden text-xs font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta md:inline-flex">All regions →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {TRADITIONS.map((t, i) => (
              <Reveal key={t.title} delay={(i % 5) * 0.05}>
                <Link to={t.to} className="group relative block overflow-hidden rounded-card">
                  <div className="aspect-[4/5] overflow-hidden bg-sand">
                    <img src={t.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-darkroast/85 via-darkroast/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[9.5px] uppercase tracking-[0.18em] text-gold">{t.region}</p>
                    <h3 className="mt-1 font-display text-[17px] leading-snug text-ivory">{t.title}</h3>
                    <p className="mt-1 text-[11px] leading-snug text-champagne">{t.text}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* E — SHOP BY SAREE TYPE */}
      <CuratedCollection
        title="Shop by Saree Type"
        subtitle="Twenty beloved traditions — and over a hundred more in the catalogue."
        viewAllTo="/collections"
        items={FEATURED_TYPES.map((t) => ({ title: t.name, caption: t.caption, image: t.image, to: `/shop?variety=${encodeURIComponent(t.name)}` }))}
      />

      {/* F — BESTSELLERS / NEW ARRIVALS */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-espresso md:text-[2.5rem]">The Saree Edit</h2>
              <div role="tablist" aria-label="Product collections" className="mt-4 flex gap-6 border-b border-sand">
                {([["bestsellers", "Bestsellers"], ["new", "New Arrivals"]] as [Tab, string][]).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={cn("-mb-px border-b-2 pb-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors", tab === k ? "border-espresso text-espresso" : "border-transparent text-mutedbrown hover:text-espresso")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Link to={tab === "bestsellers" ? "/shop?collection=Bestsellers" : "/shop?sort=newest"} className="text-xs font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta">View all →</Link>
          </div>
          {limited != null ? <RateLimitNotice retryAfter={limited} onRetry={() => load(tab)} /> : <ProductGrid products={items} loading={loading} />}
          <p className="mt-6 text-[11px] text-mutedbrown">Prices, discounts and availability are subject to change.</p>
        </div>
      </section>

      {/* G — OCCASION */}
      <OccasionGrid items={OCCASION_INFO.map((o) => ({ title: o.label, caption: o.caption, image: o.image, to: `/shop?occasion=${o.key}`, pos: o.pos }))} />

      {/* H — FABRIC */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle title="Shop by Fabric" subtitle="Pure silk, art silk, blends and handloom — always labelled honestly." />
            <Link to="/fabrics" className="mb-10 hidden text-xs font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta md:inline-flex">Fabric guide →</Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0">
            {FABRICS.map((f) => (
              <Link key={f.name} to={`/shop?fabric=${encodeURIComponent(f.name)}`} className="group w-36 shrink-0 snap-start md:w-auto">
                <div className="aspect-square overflow-hidden rounded-full border-4 border-white bg-sand shadow-card">
                  <img src={f.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
                <p className="mt-3 text-center font-display text-base text-darkroast group-hover:text-espresso">{f.name}</p>
                <p className="text-center text-[11px] text-mutedbrown">{productService.countFor((p) => p.fabric === f.name)} pieces</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* I — CRAFT STORIES */}
      <section className="bg-cream py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <SectionTitle title="Weaving & Craft Stories" subtitle="Know what was woven on the loom, what was printed or dyed, and what was embroidered after." />
          <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <Reveal>
              <Link to={`/stories#${CRAFT_STORIES[0].slug}`} className="group relative block h-full overflow-hidden rounded-card">
                <img src={CRAFT_STORIES[0].image} alt="Hands weaving on a traditional loom" loading="lazy" className="h-full min-h-[380px] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-darkroast/85 to-transparent" />
                <div className="absolute bottom-0 p-7">
                  <span className="bg-olivesage px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-ivory">{CRAFT_STORIES[0].group}</span>
                  <h3 className="mt-3 font-display text-3xl text-ivory">{CRAFT_STORIES[0].title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-champagne">{CRAFT_STORIES[0].story.slice(0, 160)}…</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Learn more <ArrowRight className="h-3.5 w-3.5" aria-hidden /></span>
                </div>
              </Link>
            </Reveal>
            <div className="grid grid-cols-2 gap-4">
              {CRAFT_STORIES.slice(1, 9).map((c, i) => (
                <Reveal key={c.slug} delay={(i % 4) * 0.05}>
                  <Link to={`/stories#${c.slug}`} className="group flex h-full gap-3 border border-sand bg-ivory p-3 transition-colors hover:border-latte">
                    <img src={c.image} alt="" loading="lazy" className="h-20 w-16 shrink-0 object-cover" />
                    <div className="min-w-0">
                      <p className={cn("text-[9.5px] font-semibold uppercase tracking-[0.14em]", c.group === "Weave" ? "text-olivesage" : c.group === "Print & Dye" ? "text-terracotta" : "text-mocha")}>{c.group}</p>
                      <h3 className="mt-0.5 font-display text-[15px] leading-tight text-darkroast">{c.title}</h3>
                      <p className="mt-1 line-clamp-2 text-[11px] text-mutedbrown">{c.kicker}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* J — BEYOND BORDERS */}
      <section className="bg-darkroast py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <SectionTitle light title="Beyond Borders: Draping Traditions of the World" subtitle="South Asian sarees alongside related — but distinct — draped garments, each credited to its country and culture." />
          {(["Saree", "Related Drape"] as const).map((kind) => (
            <div key={kind} className="mb-10 last:mb-0">
              <h3 className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {kind === "Saree" ? "South Asian Sarees" : "Related Draping Traditions — not sarees"}
                <span className="h-px flex-1 bg-warmgray/60" aria-hidden />
              </h3>
              <div className={cn("grid gap-4", kind === "Saree" ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
                {GLOBAL_TRADITIONS.filter((g) => g.kind === kind).map((g) => (
                  <Link key={g.country} to={g.to} className="group relative overflow-hidden rounded-card">
                    <div className={cn("overflow-hidden bg-warmgray", kind === "Saree" ? "aspect-[4/5]" : "aspect-square")}>
                      <img src={g.image} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-darkroast/90 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="font-display text-lg text-ivory">{g.country}</p>
                      <p className="text-[11px] leading-snug text-champagne">{g.items}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* K — HERITAGE CAMPAIGN */}
      <section className="relative overflow-hidden">
        <img src={HERITAGE_IMAGE} alt="Close-up of golden silk textile folds" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/95 via-espresso/80 to-espresso/30" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-20 md:py-28 lg:grid-cols-2 lg:px-6">
          <Reveal>
            <p className="eyebrow !text-gold">Our Heritage</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-ivory md:text-5xl">Woven by Hand.<br />Carried Through Generations.</h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-champagne md:text-[15px]">
              A saree is a map. Its fibre tells you the soil, its border the temple town, its motifs the stories a community chose to keep. We catalogue each piece by region, fabric and technique — and label honestly what is traditional, what is inspired, and what is still unverified.
            </p>
            <Link to="/heritage" className="mt-8 inline-flex items-center gap-2 border border-gold px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold hover:text-darkroast">
              Read Our Heritage <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
          <div className="hidden items-end justify-end lg:flex">
            <img src={img(IMG.handLoom, 420, 520)} alt="Weaver's hands at a loom" loading="lazy" className="w-72 rounded-card border-4 border-ivory/80 object-cover shadow-lift" />
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="bg-cream py-16 md:py-20" aria-label="Customer reviews">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <SectionTitle title="Loved Across India" subtitle="Stories from shoppers who wear our collections." />
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => {
              const avg = reviewService.average(t.productId).avg;
              return (
                <Reveal key={t.quote.slice(0, 12)} delay={i * 0.06}>
                  <figure className="flex h-full flex-col border border-sand bg-ivory p-6">
                    <Quote className="h-6 w-6 text-latte" aria-hidden />
                    <blockquote className="mt-3 flex-1 font-display text-lg leading-snug text-darkroast">“{t.quote}”</blockquote>
                    <figcaption className="mt-4 border-t border-sand pt-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-darkroast">{t.name}
                        <span className="flex gap-0.5" aria-label={`${t.stars} out of 5`}>
                          {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-3 w-3", s <= t.stars ? "fill-gold text-gold" : "text-stone")} aria-hidden />)}
                        </span>
                      </p>
                      <Link to={`/product/${t.slug}`} className="mt-1 block text-xs text-mocha hover:text-espresso">wore the {t.product} · {avg > 0 ? `${avg}★ average` : ""}</Link>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-mutedbrown">Customer review</p>
                    </figcaption>
                  </figure>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* L — TRUST & SERVICE */}
      <section className="bg-ivory py-14">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 lg:grid-cols-5 lg:px-6">
          {services.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-start gap-2.5 border border-sand bg-cream/40 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-champagne/60 text-espresso"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
              <h3 className="font-display text-lg text-darkroast">{title}</h3>
              <p className="text-xs leading-relaxed text-warmgray">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}