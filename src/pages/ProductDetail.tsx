import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, BadgeCheck, Check, ChevronDown, Copy, Heart, Loader2, Minus, Plus, Share2, ShieldQuestion, ShoppingBag, Star, Truck, X, Zap, ZoomIn, Bell, GitCompareArrows } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/products/ProductCard";
import { Breadcrumbs, ErrorState, PriceDisplay, ProductBadge, RateLimitNotice, Reveal, SectionHeading } from "../components/ui";
import { STORE_POLICY, occasionLabel, varietyBySlug } from "../data/catalogue";
import { PRODUCTS } from "../data/products";
import { useStore } from "../hooks/useStore";
import { inr, isValidEmail, isValidPincode } from "../lib/format";
import { productService, shortLinkService, viewedService } from "../services";
import { alertService, reviewService } from "../services/catalog";
import { ApiError } from "../services/api";
import type { Product, Review } from "../types";
import { cn } from "../utils/cn";

function StockAlert({ productId, name }: { productId: string; name: string }) {
  const { toast } = useStore();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setError("Enter a valid email address."); return; }
    if (alertService.subscribed(productId, email)) { setError("You're already on the list for this saree."); return; }
    alertService.subscribe(productId, email);
    setDone(true);
    toast(`We'll email you when “${name}” is back (alert stored locally).`);
  };
  if (done) return <p className="mt-4 flex items-center gap-2 border border-olivesage/40 bg-olivesage/10 p-3 text-xs text-olivesage" role="status"><Bell className="h-4 w-4" aria-hidden /> You're on the back-in-stock list for this saree.</p>;
  return (
    <form onSubmit={submit} noValidate className="mt-4 border border-sand bg-ivory p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-darkroast"><Bell className="h-4 w-4 text-mocha" aria-hidden /> Notify me when available</p>
      <div className="mt-2.5 flex gap-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email for stock alert" className="min-w-0 flex-1 border border-sand bg-white px-3 py-2 text-sm" />
        <button className="shrink-0 border border-espresso px-4 text-xs font-medium text-espresso hover:bg-espresso hover:text-cream">Notify me</button>
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-error">{error}</p>}
    </form>
  );
}

function ProductReviews({ product }: { product: Product }) {
  const { toast } = useStore();
  const [reviews, setReviews] = useState<Review[]>(() => reviewService.list(product.id));
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const avg = reviews.length ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10 : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (author.trim().length < 2) { setError("Please enter your name."); return; }
    if (title.trim().length < 4) { setError("Give your review a short title."); return; }
    if (body.trim().length < 10) { setError("Tell us a little more (min 10 characters)."); return; }
    const r = reviewService.add(product.id, { author, rating, title, body });
    setReviews(reviewService.list(product.id));
    setOpen(false); setAuthor(""); setTitle(""); setBody(""); setRating(5); setError(null);
    toast("Thanks — your review was posted.");
    void r;
  };

  return (
    <section className="mt-16" aria-label="Customer reviews">
      <SectionHeading align="left" eyebrow="Verified by Wearers" title="Customer Reviews" />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="h-fit border border-sand bg-ivory p-6 text-center">
          <p className="font-display text-5xl text-darkroast">{avg.toFixed(1)}</p>
          <p className="mt-1 flex justify-center gap-0.5" aria-label={`${avg} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-4 w-4", i <= Math.round(avg) ? "fill-gold text-gold" : "text-stone")} aria-hidden />)}
          </p>
          <p className="mt-1 text-xs text-mutedbrown">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
          <button onClick={() => setOpen((o) => !o)} className="mt-4 w-full border border-espresso py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-espresso hover:bg-espresso hover:text-cream">
            {open ? "Close" : "Write a review"}
          </button>
          {open && (
            <form onSubmit={submit} noValidate className="mt-4 space-y-3 text-left">
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name *" aria-label="Your name" className="w-full border border-sand bg-white px-3 py-2 text-sm" />
              <div>
                <span className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-mutedbrown" id="rev-rating">Rating</span>
                <div className="flex gap-1" role="radiogroup" aria-labelledby="rev-rating">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)}>
                      <Star className={cn("h-5 w-5", i <= rating ? "fill-gold text-gold" : "text-stone")} aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Review title *" aria-label="Review title" className="w-full border border-sand bg-white px-3 py-2 text-sm" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What did you love? (min 10 characters)" aria-label="Review body" className="w-full border border-sand bg-white px-3 py-2 text-sm" />
              {error && <p role="alert" className="text-xs text-error">{error}</p>}
              <button className="w-full bg-espresso py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-cream hover:bg-mocha">Post review</button>
            </form>
          )}
        </div>
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border border-sand bg-ivory p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3.5 w-3.5", i <= r.rating ? "fill-gold text-gold" : "text-stone")} aria-hidden />)}
                </span>
                <strong className="text-sm text-darkroast">{r.title}</strong>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-warmgray">{r.body}</p>
              <p className="mt-2 text-[11px] text-mutedbrown">{r.author} · {r.date} · {r.verified ? "Verified purchase" : "Unverified"}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Accordion({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-sand">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-darkroast">
        {title}
        <ChevronDown className={cn("h-4 w-4 text-mutedbrown transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="pb-5 text-sm leading-relaxed text-warmgray">{children}</div>}
    </div>
  );
}

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isWishlisted, toast, toggleCompare: toggleCmp, isCompared } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [pincode, setPincode] = useState("");
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(null); setImageIdx(0); setQty(1); setShortUrl(null); setCopied(false); setQtyError(null); setPinMsg(null);
    (async () => {
      try {
        const p = await productService.bySlug(slug);
        if (!live) return;
        setProduct(p); setColor(p.colors[0]);
        viewedService.push(p.slug);
        const r = await productService.related(p).catch(() => []);
        if (live) setRelated(r);
      } catch (e) {
        if (live) setError(e instanceof ApiError ? e : new ApiError({ status: 500, message: "Could not load this saree." }));
      } finally {
        if (live) setLoading(false);
      }
    })();
    window.scrollTo({ top: 0 });
    return () => { live = false; };
  }, [slug, reload]);

  const recentlyViewed = useMemo(
    () => viewedService.load().filter((s) => s !== slug).map((s) => PRODUCTS.find((p) => p.slug === s)).filter(Boolean).slice(0, 4) as Product[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, product]
  );

  if (loading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2 lg:px-6" aria-busy="true">
        <div className="skeleton aspect-[3/4] rounded-card" />
        <div className="space-y-4 pt-4">
          {[25, 75, 33, 100, 66].map((w, i) => <div key={i} className="skeleton h-6 rounded" style={{ width: `${w}%` }} />)}
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        {error?.status === 429 ? <RateLimitNotice retryAfter={error.retryAfter} onRetry={() => setReload((r) => r + 1)} /> : <ErrorState message={error?.message ?? "Product not found."} />}
        <div className="mt-6 text-center"><Link to="/shop" className="text-sm text-espresso underline underline-offset-4">Back to all sarees</Link></div>
      </div>
    );
  }

  const p = product;
  const compared = isCompared(p.id);
  const toggleCompare = () => toggleCmp(p);
  const variety = varietyBySlug(p.varietySlug);
  const wished = isWishlisted(p.id);
  const out = p.stock <= 0;
  const origin = p.country === "India" ? `${p.state}, India` : p.state === p.country ? p.country : `${p.state}, ${p.country}`;

  const validateQty = (n: number) => {
    if (!Number.isInteger(n) || n < 1) return "Quantity must be at least 1.";
    if (n > p.stock) return `Only ${p.stock} available.`;
    return null;
  };

  const onAdd = (buyNow = false) => {
    const err = out ? "This piece is currently out of stock." : validateQty(qty);
    setQtyError(err);
    if (err) return;
    const ok = addToCart(p, qty, color, !buyNow);
    if (ok && buyNow) navigate("/checkout");
  };

  const share = async () => {
    setSharing(true);
    try {
      const link = await shortLinkService.create(`/product/${p.slug}`, p.name);
      setShortUrl(shortLinkService.url(link.code));
      toast("Short link generated.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not generate a short link.", "error");
    } finally { setSharing(false); }
  };

  const copy = async () => {
    if (!shortUrl) return;
    try { await navigator.clipboard.writeText(shortUrl); setCopied(true); toast("Link copied."); setTimeout(() => setCopied(false), 2500); }
    catch { toast("Clipboard unavailable — select and copy the link manually.", "error"); }
  };

  const verified: [string, string][] = [
    ["Fabric", p.fabricDetail],
    ["Composition", p.composition],
    ["Loom", p.loom],
    ["Weaving & techniques", p.techniques.join(", ")],
    ["Colour", p.colours.join(", ")],
    ["Motif", p.motif],
    ["Border", p.border],
    ["Weight", p.weight],
    ["Care", p.care],
  ];
  const unverified: [string, string][] = [
    ["Region of origin", p.originVerified ? `${origin} — verified` : `${origin} — not yet verified`],
    ["Artisan / cluster", p.artisan],
    ["Pallu", p.pallu],
    ["Length & blouse piece", p.length],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-12">
      <Breadcrumbs items={[
        { label: "Home", to: "/" }, { label: "Shop", to: "/shop" },
        { label: p.state, to: `/shop?state=${encodeURIComponent(p.state)}` },
        { label: p.variety, to: `/shop?variety=${encodeURIComponent(p.variety)}` },
        { label: p.name },
      ]} />

      <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        {/* Gallery */}
        <div className="lg:sticky lg:top-40 lg:self-start">
          <div className="flex gap-3">
            <div className="hidden flex-col gap-3 sm:flex" role="tablist" aria-label="Product images">
              {p.images.map((src, i) => (
                <button key={i} role="tab" aria-selected={imageIdx === i} aria-label={p.imageCaptions[i] ?? `Image ${i + 1}`} onClick={() => setImageIdx(i)}
                  className={cn("group/th overflow-hidden border-2 transition-colors", imageIdx === i ? "border-espresso" : "border-transparent hover:border-latte")}>
                  <img src={src} alt="" className="h-24 w-[4.5rem] object-cover" loading="lazy" />
                  <span className="block max-w-[4.5rem] truncate pt-1 text-[9px] uppercase tracking-[0.08em] text-mutedbrown">{(p.imageCaptions[i] ?? "").split(" ")[0]}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setLightbox(true)}
                onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
                onMouseLeave={() => setZoom(null)}
                aria-label="Open enlarged image"
                className="group relative block w-full cursor-zoom-in overflow-hidden rounded-card bg-sand/50"
              >
                <img src={p.images[imageIdx]} alt={`${p.name} — ${p.imageCaptions[imageIdx] ?? `view ${imageIdx + 1}`} (representative image)`}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-200"
                  style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
                <span className="absolute bottom-3 left-3 bg-darkroast/80 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-cream">{p.imageCaptions[imageIdx] ?? `View ${imageIdx + 1}`}</span>
                <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-darkroast"><ZoomIn className="h-3 w-3" aria-hidden /> Zoom</span>
              </button>
              {p.badge && <div className="pointer-events-none absolute left-4 top-4"><ProductBadge badge={p.badge} /></div>}
              <div className="mt-3 flex gap-2 sm:hidden">
                {p.images.map((src, i) => (
                  <button key={i} onClick={() => setImageIdx(i)} aria-label={p.imageCaptions[i] ?? `Image ${i + 1}`} className={cn("overflow-hidden border-2", imageIdx === i ? "border-espresso" : "border-transparent")}>
                    <img src={src} alt="" className="h-16 w-12 object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-mutedbrown">Gallery shows a styling reference, a fabric close-up and the loom — representative imagery, not photographs of this exact piece.</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="eyebrow">{p.variety} · {origin}</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-darkroast md:text-[2.6rem]">{p.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-gold" aria-label={`Rated ${p.rating} out of 5`}><Star className="h-4 w-4 fill-gold" aria-hidden /> {p.rating}</span>
            <span className="text-mutedbrown">{p.reviews} reviews</span>
            {p.originVerified
              ? <span className="flex items-center gap-1 text-xs text-olivesage"><BadgeCheck className="h-4 w-4" aria-hidden /> Origin verified</span>
              : <span className="flex items-center gap-1 text-xs text-mutedbrown"><ShieldQuestion className="h-4 w-4" aria-hidden /> Origin not yet verified</span>}
            {p.status === "inspired" && <span className="border border-gold/60 bg-gold/10 px-2 py-0.5 text-[11px] text-darkroast">Contemporary adaptation</span>}
            {p.kind !== "Saree" && <span className="border border-terracotta/50 bg-terracotta/10 px-2 py-0.5 text-[11px] text-terracotta">{p.kind} — not a saree</span>}
          </div>

          <div className="mt-5"><PriceDisplay price={p.price} originalPrice={p.originalPrice} size="lg" /></div>
          <p className="mt-1 text-xs text-mutedbrown">Inclusive of taxes</p>
          <p className="mt-5 text-sm leading-relaxed text-warmgray">{p.description}</p>

          {p.colors.length > 1 && (
            <fieldset className="mt-6">
              <legend className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-darkroast">Colour — <span className="font-normal normal-case text-warmgray">{color}</span></legend>
              <div className="flex flex-wrap gap-2">
                {p.colors.map((c) => (
                  <button key={c} onClick={() => setColor(c)} aria-pressed={color === c} className={cn("border px-4 py-2 text-xs", color === c ? "border-espresso bg-espresso text-cream" : "border-sand bg-white text-warmgray hover:border-mocha")}>{c}</button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-5">
            <div className="flex items-center border border-sand bg-white" role="group" aria-label="Quantity">
              <button onClick={() => { const n = Math.max(1, qty - 1); setQty(n); setQtyError(null); }} disabled={out} aria-label="Decrease quantity" className="flex h-11 w-11 items-center justify-center text-warmgray hover:bg-cream disabled:opacity-40"><Minus className="h-4 w-4" aria-hidden /></button>
              <input
                value={qty} inputMode="numeric" aria-label="Quantity" disabled={out}
                onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "") || 0); setQty(n); setQtyError(validateQty(n)); }}
                className="w-12 bg-transparent text-center text-sm font-medium focus:outline-none"
              />
              <button onClick={() => { const n = qty + 1; if (n > p.stock) { setQtyError(`Only ${p.stock} available.`); return; } setQty(n); setQtyError(null); }} disabled={out} aria-label="Increase quantity" className="flex h-11 w-11 items-center justify-center text-warmgray hover:bg-cream disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden /></button>
            </div>
            {out ? <p className="text-sm font-medium text-error">Out of stock</p>
              : p.stock <= 3 ? <p className="text-sm font-medium text-terracotta">Low stock — only {p.stock} left</p>
              : <p className="flex items-center gap-1.5 text-sm font-medium text-olivesage"><Check className="h-4 w-4" aria-hidden /> In stock</p>}
          </div>
          {qtyError && <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-error"><AlertCircle className="h-3.5 w-3.5" aria-hidden /> {qtyError}</p>}

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <button onClick={() => onAdd(false)} disabled={out} className="inline-flex items-center justify-center gap-2 bg-espresso px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-cream shadow-card hover:bg-mocha disabled:cursor-not-allowed disabled:opacity-50">
              <ShoppingBag className="h-4 w-4" aria-hidden /> Add to Cart
            </button>
            <button onClick={() => onAdd(true)} disabled={out} className="inline-flex items-center justify-center gap-2 bg-terracotta px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-ivory hover:bg-mocha disabled:cursor-not-allowed disabled:opacity-50">
              <Zap className="h-4 w-4" aria-hidden /> Buy Now
            </button>
            <button onClick={() => toggleWishlist(p)} aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              className={cn("inline-flex items-center justify-center gap-2 border px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em]", wished ? "border-terracotta bg-terracotta/10 text-terracotta" : "border-espresso text-espresso hover:bg-espresso hover:text-cream")}>
              <Heart className={cn("h-4 w-4", wished && "fill-terracotta")} aria-hidden /> <span className="sm:hidden">Wishlist</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={toggleCompare} aria-pressed={compared}
              className={cn("inline-flex items-center gap-2 border px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em]", compared ? "border-terracotta bg-terracotta/10 text-terracotta" : "border-sand text-warmgray hover:border-espresso hover:text-espresso")}>
              <GitCompareArrows className="h-4 w-4" aria-hidden /> {compared ? "In compare tray" : "Compare sarees"}
            </button>
            <Link to="/compare" className="inline-flex items-center gap-2 px-2 py-2.5 text-xs text-mocha underline underline-offset-4">Open comparison →</Link>
          </div>
          {out && <StockAlert productId={p.id} name={p.name} />}

          {/* Delivery placeholder */}
          <div className="mt-5 border border-sand bg-ivory p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-darkroast"><Truck className="h-4 w-4 text-mocha" aria-hidden /> Delivery</p>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPinMsg(isValidPincode(pincode) ? `PIN ${pincode} looks valid. Delivery estimates will appear here once courier integration is live.` : "Please enter a valid 6-digit PIN code."); }}>
              <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter PIN code" aria-label="PIN code" className="flex-1 border border-sand bg-white px-3 py-2 text-sm" />
              <button className="border border-espresso px-4 text-xs font-medium text-espresso hover:bg-espresso hover:text-cream">Check</button>
            </form>
            {pinMsg && <p className="mt-2 text-xs text-warmgray" aria-live="polite">{pinMsg}</p>}
            {STORE_POLICY.freeShippingThreshold && <p className="mt-2 text-[11px] text-mutedbrown">Free shipping above {inr(STORE_POLICY.freeShippingThreshold)}.{STORE_POLICY.returnWindowDays ? ` ${STORE_POLICY.returnWindowDays}-day returns on unworn pieces.` : ""}</p>}
          </div>

          {/* Share */}
          <div className="mt-4">
            <button onClick={share} disabled={sharing} className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-mocha hover:text-espresso disabled:opacity-60">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />} {sharing ? "Generating short link…" : "Share this saree"}
            </button>
            {shortUrl && (
              <div className="mt-2 flex items-center gap-2 border border-sand bg-white px-3 py-2">
                <input readOnly value={shortUrl} aria-label="Short link" onFocus={(e) => e.target.select()} className="min-w-0 flex-1 bg-transparent text-xs text-warmgray focus:outline-none" />
                <button onClick={copy} className="inline-flex items-center gap-1 text-xs font-medium text-espresso">
                  {copied ? <Check className="h-3.5 w-3.5 text-olivesage" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="mt-6 border-t border-sand">
            <Accordion title="Product attributes" defaultOpen>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-olivesage">Listed attributes (supplier-declared)</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
                {verified.map(([k, v]) => (<div key={k} className="contents"><dt className="text-mutedbrown">{k}</dt><dd className="text-darkroast">{v}</dd></div>))}
              </dl>
              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta">Unverified or to be confirmed</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
                {unverified.map(([k, v]) => (<div key={k} className="contents"><dt className="text-mutedbrown">{k}</dt><dd className="text-darkroast">{v}</dd></div>))}
              </dl>
            </Accordion>
            <Accordion title="Craft & artisan story">
              <p>{p.story}</p>
              {variety && <p className="mt-3">Learn more about <Link to={`/shop?variety=${encodeURIComponent(variety.name)}`} className="text-espresso underline underline-offset-4">{variety.name}</Link> and other traditions of <Link to={`/shop?state=${encodeURIComponent(p.state)}`} className="text-espresso underline underline-offset-4">{p.state}</Link>.</p>}
            </Accordion>
            <Accordion title="Occasions">
              <div className="flex flex-wrap gap-2">
                {p.occasion.map((o) => <Link key={o} to={`/shop?occasion=${o}`} className="border border-sand px-3 py-1 text-xs hover:border-espresso">{occasionLabel(o)}</Link>)}
              </div>
            </Accordion>
            <Accordion title="Care instructions"><p>{p.careText}</p></Accordion>
          </div>
        </div>
      </div>

      <ProductReviews product={p} />

      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeading align="left" eyebrow="From the same tradition" title="You May Also Love" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
            {related.map((r, i) => <Reveal key={r.id} delay={i * 0.05}><ProductCard product={r} /></Reveal>)}
          </div>
        </section>
      )}
      {recentlyViewed.length > 0 && (
        <section className="mt-16">
          <SectionHeading align="left" eyebrow="Pick up where you left off" title="Recently Viewed" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
            {recentlyViewed.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-darkroast/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(false)} role="dialog" aria-label="Enlarged image">
            <button onClick={() => setLightbox(false)} aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-darkroast"><X className="h-5 w-5" aria-hidden /></button>
            <img src={p.images[imageIdx].replace(/w=\d+/, "w=1400").replace(/h=\d+/, "h=1866")} alt={`${p.name} — ${p.imageCaptions[imageIdx] ?? "enlarged view"}`} className="max-h-[90vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-6 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {p.images.map((_, i) => <button key={i} onClick={() => setImageIdx(i)} aria-label={`Image ${i + 1}`} className={cn("h-2.5 w-2.5 rounded-full", imageIdx === i ? "bg-ivory" : "bg-ivory/40")} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}