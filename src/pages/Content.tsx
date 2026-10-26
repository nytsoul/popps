import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Circle, Loader2, Mail, MapPin, MessageCircle, Package, Phone, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Breadcrumbs, RateLimitNotice, Reveal } from "../components/ui";
import { CRAFT_STORIES, IMG, STORE_POLICY, VARIETIES, img } from "../data/catalogue";
import { STORY_IMAGE } from "../data/products";
import { inr, isValidEmail, shortDate } from "../lib/format";
import { contactService, orderService, shortLinkService } from "../services";
import { ApiError } from "../services/api";
import type { Order, OrderStatus } from "../types";
import { cn } from "../utils/cn";

/* --------------------------------- Heritage --------------------------------- */

export function HeritagePage() {
  return (
    <div>
      <section className="bg-ivory">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:gap-16 lg:px-6 lg:py-20">
          <Reveal>
            <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Our Heritage" }]} />
            <p className="eyebrow">Our Heritage</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-darkroast md:text-5xl">A World Woven in Tradition.</h1>
            <p className="mt-5 text-[15px] leading-relaxed text-warmgray">
              ShopScale began as a question: how do you shop for a saree when every one of them carries a region, a fibre, a technique and a story? We built a catalogue of {VARIETIES.length}+ named traditions — from Kanchipuram to Kotpad, Patan to Pochampally — and connected each piece to where and how it was made.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-warmgray">
              We are careful with words. We distinguish established varieties from contemporary adaptations, pure silk from art silk, and sarees from related draped garments of other cultures. Where details are not yet verified, we say so.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/stories" className="inline-flex items-center gap-2 bg-espresso px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream hover:bg-mocha">Craft Stories <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link to="/regions" className="inline-flex items-center gap-2 border border-espresso px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-espresso hover:bg-espresso hover:text-cream">Explore Regions</Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative">
              <img src={STORY_IMAGE} alt="A traditional wooden loom threaded for weaving" loading="lazy" className="aspect-[4/4.5] w-full rounded-card object-cover" />
              <img src={img(IMG.handsBW, 500, 380)} alt="Artisan hands at work on a loom" loading="lazy" className="absolute -bottom-6 -left-4 hidden w-48 rounded-card border-4 border-ivory object-cover shadow-lift md:block" />
            </div>
          </Reveal>
        </div>
      </section>
      <section className="bg-cream py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-3 lg:px-6">
          {[
            ["Honest labelling", "Composition, loom type and technique are listed for every piece. Art silk is never sold as pure silk."],
            ["Origin, carefully stated", "Regional identity is shown, and marked unverified until a supplier record confirms it."],
            ["Credit where it's due", "Related traditions from Indonesia, Malaysia, Cambodia and beyond are credited to their cultures — never relabelled as sarees."],
          ].map(([t, d]) => (
            <div key={t} className="border border-sand bg-ivory p-6">
              <h2 className="font-display text-xl text-espresso">{t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-warmgray">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="legal" className="border-t border-sand bg-ivory py-12">
        <div className="mx-auto max-w-3xl px-4 text-xs leading-relaxed text-mutedbrown lg:px-6">
          <h2 className="font-display text-xl text-darkroast">Privacy, Terms & Service Notice</h2>
          <p className="mt-3">ShopScale is currently running in a limited preview. Cart, wishlist, account and orders are stored only in your browser. No real payments are processed and no card information is collected. Prices, stock, ratings, discounts and artisan attributions are sample data. Photography is licensed stock imagery used as representative styling — not proof of a specific product's weave or origin. Model portraits are licensed stock photos chosen for their graceful, traditional look; no celebrity or real person is depicted or endorsed. Full privacy policy and terms will be published before any commercial launch.</p>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------- Stories --------------------------------- */

export function StoriesPage() {
  return (
    <div>
      <section className="border-b border-sand bg-ivory">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 lg:px-6">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Craft & Artisan Stories" }]} />
          <p className="eyebrow">Heritage Stories</p>
          <h1 className="mt-2 font-display text-4xl text-darkroast md:text-5xl">Craft & Artisan Stories</h1>
          <p className="mt-3 max-w-2xl text-sm text-warmgray">Weaving creates pattern in the cloth; printing and dyeing add colour to woven cloth; embroidery is needlework added afterwards. Here is how each craft works.</p>
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Stories">
            {CRAFT_STORIES.map((c) => <a key={c.slug} href={`#${c.slug}`} onClick={(e) => { e.preventDefault(); document.getElementById(c.slug)?.scrollIntoView({ behavior: "smooth" }); }} className="border border-sand bg-white px-3 py-1.5 text-xs hover:border-espresso">{c.title}</a>)}
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
        {CRAFT_STORIES.map((c, i) => {
          const key = c.group === "Weave" ? "weave" : c.group === "Print & Dye" ? "print" : "embellishment";
          return (
            <Reveal key={c.slug}>
              <article id={c.slug} className={cn("mb-14 grid scroll-mt-44 items-center gap-8 md:grid-cols-2", i % 2 && "md:[&>*:first-child]:order-2")}>
                <img src={c.image} alt={c.title} loading="lazy" className="aspect-[5/4] w-full rounded-card object-cover" />
                <div>
                  <span className={cn("px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ivory", c.group === "Weave" ? "bg-olivesage" : c.group === "Print & Dye" ? "bg-terracotta" : "bg-mocha")}>{c.group}</span>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-mutedbrown">{c.kicker}</p>
                  <h2 className="mt-1 font-display text-3xl text-darkroast">{c.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-warmgray">{c.story}</p>
                  <p className="mt-3 text-xs text-mutedbrown">Found in: {VARIETIES.filter((v) => v.techniques.includes(c.technique)).slice(0, 6).map((v) => v.name).join(", ") || "—"}</p>
                  <Link to={`/shop?${key}=${encodeURIComponent(c.technique)}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-espresso hover:text-terracotta">Shop {c.technique} <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- Contact --------------------------------- */

const FAQS = [
  ["How do I know if a saree is pure silk?", "Each product lists its composition — Pure, Blend, Natural Fibre, or Art Silk / Synthetic. We never list art silk as pure silk."],
  ["What does 'origin not yet verified' mean?", "The regional tradition is shown, but a supplier record confirming the weaving cluster has not yet been attached to this listing."],
  ["Are these real orders?", "No. ShopScale is a prototype: checkout uses a mock adapter, no payment is taken and nothing ships."],
  ["What is a 'related draping tradition'?", "Garments like the Malaysian songket or Myanmar longyi are culturally distinct from sarees. We list them separately and credit their countries of origin."],
  ["How should I care for zari?", "Dry clean only, store folded in muslin away from sunlight, and refold every few months to prevent the metallic threads from cracking."],
];

export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "Product question", orderRef: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [ticket, setTicket] = useState("");
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (form.name.trim().length < 2) er.name = "Please enter your name.";
    if (!isValidEmail(form.email)) er.email = "Please enter a valid email.";
    if (form.message.trim().length < 10) er.message = "Please write at least 10 characters.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setState("sending"); setApiError(null);
    try {
      const r = await contactService.submit(form);
      setTicket(r.ticket); setState("sent");
    } catch (err) {
      setApiError(err instanceof ApiError ? err : new ApiError({ status: 500, message: "Could not send your message." }));
      setState("error");
    }
  };
  const input = (k: string) => cn("w-full border bg-white px-3.5 py-3 text-sm focus:outline-none", errors[k] ? "border-error" : "border-sand focus:border-mocha");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Contact & Support" }]} />
      <h1 className="font-display text-4xl text-darkroast md:text-5xl">Contact & Customer Support</h1>
      <p className="mt-3 max-w-2xl text-sm text-warmgray">Questions about a weave, an order or care? Write to us — or track an order yourself.</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          {state === "sent" ? (
            <div className="border border-olivesage/40 bg-olivesage/10 p-8 text-center" role="status">
              <CheckCircle2 className="mx-auto h-10 w-10 text-olivesage" aria-hidden />
              <p className="mt-3 font-display text-2xl text-darkroast">Message received</p>
              <p className="mt-2 text-sm text-warmgray">Support ticket <strong className="font-mono">{ticket}</strong> was created. No email is sent yet.</p>
              <button onClick={() => { setState("idle"); setForm({ ...form, message: "" }); }} className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-espresso underline underline-offset-4">Send another</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-4 border border-sand bg-ivory p-6 sm:grid-cols-2">
              <div><label htmlFor="c-name" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Name</label><input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input("name")} aria-invalid={!!errors.name} />{errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}</div>
              <div><label htmlFor="c-email" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Email</label><input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input("email")} aria-invalid={!!errors.email} />{errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}</div>
              <div><label htmlFor="c-topic" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Topic</label>
                <select id="c-topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={input("topic")}>
                  {["Product question", "Order & delivery", "Returns & exchanges", "Care advice", "Wholesale / artisans", "Other"].map((t) => <option key={t}>{t}</option>)}
                </select></div>
              <div><label htmlFor="c-ref" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Order reference (optional)</label><input id="c-ref" value={form.orderRef} onChange={(e) => setForm({ ...form, orderRef: e.target.value })} placeholder="SS-2026-…" className={input("orderRef")} /></div>
              <div className="sm:col-span-2"><label htmlFor="c-msg" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Message</label><textarea id="c-msg" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={input("message")} aria-invalid={!!errors.message} />{errors.message && <p className="mt-1 text-xs text-error">{errors.message}</p>}</div>
              {apiError && (apiError.status === 429 ? <div className="sm:col-span-2"><RateLimitNotice compact retryAfter={apiError.retryAfter} /></div> : <p role="alert" className="flex items-center gap-2 text-xs text-error sm:col-span-2"><AlertTriangle className="h-4 w-4" aria-hidden /> {apiError.message}</p>)}
              <button type="submit" disabled={state === "sending"} className="inline-flex items-center justify-center gap-2 bg-espresso py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-cream hover:bg-mocha disabled:opacity-60 sm:col-span-2">
                {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send message
              </button>
            </form>
          )}
        </div>
        <aside className="space-y-6">
          <div className="grid gap-3">
            <a href={`mailto:${STORE_POLICY.supportEmail}`} className="flex items-center gap-3 border border-sand bg-ivory p-4 hover:border-espresso"><Mail className="h-5 w-5 text-mocha" aria-hidden /><span className="text-sm">{STORE_POLICY.supportEmail}</span></a>
            <a href="tel:+918000000000" className="flex items-center gap-3 border border-sand bg-ivory p-4 hover:border-espresso"><Phone className="h-5 w-5 text-mocha" aria-hidden /><span className="text-sm">{STORE_POLICY.supportPhone}</span></a>
            <a href="https://wa.me/918000000000" target="_blank" rel="noreferrer" className="flex items-center gap-3 border border-sand bg-ivory p-4 hover:border-espresso"><MessageCircle className="h-5 w-5 text-olivesage" aria-hidden /><span className="text-sm">WhatsApp</span></a>
            <Link to="/track" className="flex items-center gap-3 border border-espresso bg-espresso p-4 text-cream hover:bg-mocha"><Package className="h-5 w-5" aria-hidden /><span className="text-sm">Track an order</span></Link>
          </div>
          <div id="services">
            <h2 className="font-display text-2xl text-darkroast">Shipping & returns</h2>
            <ul className="mt-3 space-y-2 text-sm text-warmgray">
              {STORE_POLICY.freeShippingThreshold && <li>Free shipping above {inr(STORE_POLICY.freeShippingThreshold)}; {inr(STORE_POLICY.flatShipping)} flat below.</li>}
              {STORE_POLICY.returnWindowDays && <li>{STORE_POLICY.returnWindowDays}-day returns on unworn pieces with tags intact.</li>}
              <li>Delivery estimates will appear once courier integration is live.</li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-2xl text-darkroast">FAQs</h2>
            <div className="mt-3 border-t border-sand">
              {FAQS.map(([q, a], i) => (
                <div key={q} className="border-b border-sand">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} className="flex w-full items-center justify-between py-3.5 text-left text-sm font-medium text-darkroast">
                    {q}<ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", openFaq === i && "rotate-180")} aria-hidden />
                  </button>
                  {openFaq === i && <p className="pb-4 text-sm text-warmgray">{a}</p>}
                </div>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-2 text-xs text-mutedbrown"><MapPin className="h-3.5 w-3.5" aria-hidden /> Studio: Indiranagar, Bengaluru</p>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------- Order tracking ------------------------------ */

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "placed", label: "Order placed" }, { key: "confirmed", label: "Inventory reserved" },
  { key: "processing", label: "Processing" }, { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" }, { key: "delivered", label: "Delivered" },
];

export function TrackOrderPage() {
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get("ref") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const lookup = async (r = ref, e = email) => {
    if (!r.trim() || !isValidEmail(e)) { setError(new ApiError({ status: 400, message: "Enter your order reference and the email used at checkout." })); return; }
    setLoading(true); setError(null);
    try { setOrder(await orderService.track(r, e)); }
    catch (err) { setOrder(null); setError(err instanceof ApiError ? err : new ApiError({ status: 500, message: "Lookup failed." })); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (params.get("ref") && params.get("email")) void lookup(params.get("ref")!, params.get("email")!); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* Live updates as simulated Kafka consumers advance the order. */
  useEffect(() => {
    if (!order) return;
    const refresh = () => { const o = orderService.byReference(order.reference); if (o) setOrder({ ...o }); };
    window.addEventListener("shopscale:order", refresh);
    const t = window.setInterval(refresh, 2500);
    return () => { window.removeEventListener("shopscale:order", refresh); window.clearInterval(t); };
  }, [order?.reference]); // eslint-disable-line react-hooks/exhaustive-deps

  const idx = order ? STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Track Order" }]} />
      <h1 className="font-display text-4xl text-darkroast">Track Your Order</h1>
      <p className="mt-2 text-sm text-warmgray">Try the sample order <button className="font-mono text-espresso underline" onClick={() => { setRef("SS-2026-01841"); setEmail("asha@example.com"); void lookup("SS-2026-01841", "asha@example.com"); }}>SS-2026-01841</button> with asha@example.com.</p>
      <form onSubmit={(e) => { e.preventDefault(); void lookup(); }} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Order reference" aria-label="Order reference" className="border border-sand bg-white px-3.5 py-3 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email used at checkout" aria-label="Email" className="border border-sand bg-white px-3.5 py-3 text-sm" />
        <button disabled={loading} className="inline-flex items-center justify-center gap-2 bg-espresso px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-cream disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />} Track
        </button>
      </form>
      {error && (error.status === 429 ? <div className="mt-6"><RateLimitNotice compact retryAfter={error.retryAfter} onRetry={() => lookup()} /></div> : <p role="alert" className="mt-4 text-sm text-error">{error.message}</p>)}
      {order && (
        <div className="mt-8 border border-sand bg-ivory">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand px-6 py-4">
            <div><p className="font-mono text-espresso">{order.reference}</p><p className="text-xs text-mutedbrown">Placed {shortDate(order.createdAt)} · {inr(order.total)}</p></div>
            {order.mock && <span className="border border-warning/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-warmgray">Local order</span>}
          </div>
          <ol className="px-6 py-6" aria-label="Order progress">
            {STEPS.map((s, i) => {
              const done = i <= idx;
              const ev = order.events.find((e) => e.status === s.key);
              return (
                <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && <span className={cn("absolute left-[9px] top-5 h-full w-px", i < idx ? "bg-olivesage" : "bg-sand")} aria-hidden />}
                  {done ? <CheckCircle2 className="relative h-5 w-5 shrink-0 text-olivesage" aria-hidden /> : <Circle className={cn("relative h-5 w-5 shrink-0", i === idx + 1 ? "animate-pulse text-latte" : "text-stone")} aria-hidden />}
                  <div>
                    <p className={cn("text-sm font-medium", done ? "text-darkroast" : "text-mutedbrown")}>{s.label}</p>
                    {ev && <p className="text-xs text-mutedbrown">{new Date(ev.at).toLocaleString("en-IN")} — {ev.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <ul className="divide-y divide-sand border-t border-sand px-6">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <img src={it.image} alt="" className="h-14 w-11 object-cover" />
                <span className="flex-1 text-sm">{it.name} <span className="text-xs text-mutedbrown">× {it.quantity}</span></span>
                <span className="text-sm">{inr(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-sand px-6 py-3 text-[11px] text-mutedbrown">Status updates are driven by simulated event consumers (orders.created → inventory.reserved → notifications.requested → orders.status-updated).</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Utility routes ------------------------------ */

export function RateLimitedPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <RateLimitNotice retryAfter={Number(params.get("retry") ?? 10)} onRetry={() => navigate(-1)} />
    </div>
  );
}

export function ShortLinkRedirect() {
  const { code = "" } = useParams();
  const link = shortLinkService.resolve(code);
  if (!link) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-darkroast">Link not found</h1>
        <p className="mt-3 text-sm text-warmgray">This short link doesn't exist or has been removed.</p>
        <Link to="/shop" className="mt-6 inline-block bg-espresso px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-cream">Browse sarees</Link>
      </div>
    );
  }
  return <Navigate to={link.target} replace />;
}
