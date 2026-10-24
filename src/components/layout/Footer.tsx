import { ArrowRight, ChevronDown, Globe, Loader2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { I18nKey } from "../../lib/i18n";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { isValidEmail } from "../../lib/format";
import { newsletterService } from "../../services";
import { useStore } from "../../hooks/useStore";
import { cn } from "../../utils/cn";

export function Newsletter() {
  const { t } = useStore();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setState("error");
      setMessage("Please enter a valid email address, e.g. name@example.com.");
      return;
    }
    setState("loading");
    try {
      await newsletterService.subscribe(email);
      setState("ok");
      setMessage("Thank you — your demo subscription was recorded. Look out for our first note.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("We couldn't save your subscription just now. Please try again in a moment.");
    }
  };

  return (
    <section id="newsletter" className="bg-coffee">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center md:py-20 lg:px-6">
        <div>
          <p className="eyebrow !text-champagne">The ShopScale Letter</p>
          <h2 className="mt-2 font-display text-3xl text-ivory md:text-4xl">{t("footer_newsletter")}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-champagne">
            Weaver stories, new arrivals and thoughtful styling notes — delivered occasionally, never noisily.
          </p>
        </div>
        <form onSubmit={submit} noValidate className="w-full">
          <label htmlFor="newsletter-email" className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-champagne">Email address</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mutedbrown" aria-hidden />
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setState("idle"); }}
                placeholder="you@example.com"
                aria-invalid={state === "error"}
                aria-describedby="newsletter-feedback"
                className="w-full border border-transparent bg-ivory py-3.5 pl-10 pr-4 text-sm text-darkroast placeholder:text-mutedbrown focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={state === "loading"}
              className="inline-flex items-center justify-center gap-2 bg-terracotta px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-gold hover:text-darkroast disabled:opacity-70"
            >
              {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <>{t("newsletter_subscribe")} <ArrowRight className="h-3.5 w-3.5" aria-hidden /></>}
            </button>
          </div>
          <p id="newsletter-feedback" aria-live="polite" className="mt-3 min-h-5 text-xs">
            {state === "ok" && <span className="text-champagne">✓ {message}</span>}
            {state === "error" && <span className="text-rosebeige">{message}</span>}
          </p>
        </form>
      </div>
    </section>
  );
}

/* ---------- Brand social icons (lucide no longer ships brand marks) ---------- */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const SOCIALS: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "Facebook", href: "https://www.facebook.com",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...S}><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" /></svg>,
  },
  {
    label: "Instagram", href: "https://www.instagram.com",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...S}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>,
  },
  {
    label: "Pinterest", href: "https://www.pinterest.com",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...S}><circle cx="12" cy="12" r="9" /><path d="M11 8.5c2.8-.8 5 .8 4.6 3.4-.3 2-2 3.3-3.6 2.8M12 11l-2.2 9" /></svg>,
  },
  {
    label: "YouTube", href: "https://www.youtube.com",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...S}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></svg>,
  },
  {
    label: "LinkedIn", href: "https://www.linkedin.com",
    icon: <svg viewBox="0 0 24 24" className="h-4 w-4" {...S}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V17M8 7.5v.01M12 17v-6.5M12 13.2c0-1.6 1-2.7 2.4-2.7 1.4 0 2.1 1 2.1 2.7V17" /></svg>,
  },
];

const TITLE_KEY: Record<string, I18nKey> = {
  "Shop by Category": "footer_shop",
  "Shop by Region": "footer_region",
  "Heritage & Help": "footer_help",
};

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Shop by Category",
    links: [
      { label: "Shop All Sarees", to: "/shop" },
      { label: "Silk Sarees", to: "/shop?fabric=Silk" },
      { label: "Cotton & Handloom", to: "/shop?fabric=Cotton" },
      { label: "Bridal & Wedding", to: "/shop?occasion=Wedding" },
      { label: "Bestsellers", to: "/shop?collection=Bestsellers" },
      { label: "New Arrivals", to: "/shop?collection=New%20Arrivals" },
      { label: "Sale", to: "/shop?collection=On%20Sale" },
      { label: "All Saree Types", to: "/collections" },
      { label: "Compare Sarees", to: "/compare" },
      { label: "Fabric & Weaving Guide", to: "/guide" },
    ],
  },
  {
    title: "Shop by Region",
    links: [
      { label: "South India", to: "/shop?zone=South%20India" },
      { label: "West India", to: "/shop?zone=West%20India" },
      { label: "East India", to: "/shop?zone=East%20India" },
      { label: "Northeast India", to: "/shop?zone=Northeast%20India" },
      { label: "North & Central", to: "/shop?zone=North%20India&zone=Central%20India" },
      { label: "Beyond Borders", to: "/shop?zone=South%20Asia" },
      { label: "Related Drapes", to: "/shop?kind=Related%20Drape" },
      { label: "Regional Atlas", to: "/regions" },
    ],
  },
  {
    title: "Heritage & Help",
    links: [
      { label: "Our Heritage", to: "/heritage" },
      { label: "Craft & Artisan Stories", to: "/stories" },
      { label: "Contact & Support", to: "/contact" },
      { label: "Track Your Order", to: "/track" },
      { label: "Shipping & Returns", to: "/contact#services" },
      { label: "Privacy Policy", to: "/heritage#legal" },
      { label: "Terms & Conditions", to: "/heritage#legal" },
      { label: "Sign In / Register", to: "/login" },
      { label: "Forgot Password", to: "/forgot-password" },
      { label: "My Account", to: "/account" },
      { label: "Admin Login", to: "/admin/login" },
      { label: "Admin & Engineering", to: "/admin" },
    ],
  },
];

const PAYMENTS = ["UPI", "Visa", "Mastercard", "RuPay", "Net Banking", "COD"];

function BrandStory() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-y border-latte/40 bg-ivory">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 py-5 text-left"
        >
          <span className="font-display text-lg text-espresso md:text-xl">Every Saree Tells a Story — the ShopScale Promise</span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-espresso transition-transform duration-300", open && "rotate-180")} aria-hidden />
        </button>
        <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden">
            <div className="grid gap-5 text-sm leading-relaxed text-warmgray md:grid-cols-2">
              <p>
                ShopScale catalogues sarees by region, fabric and technique — from Kanchipuram silk to Bengal tant, Patan patola to Assam muga — and labels honestly what is traditional, what is inspired, and what is still unverified. Every piece is sourced directly from weaving families, so the craft is credited and the price is fair.
              </p>
              <p>
                From everyday cotton drapes to heirloom bridal silks, each listing names its weave, fabric and care, so you always know what you're bringing home. Tradition sets the pattern; you decide how to wear it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const { t, locale, setLocale } = useStore();
  return (
    <footer className="bg-[#F3E7DF] text-darkroast">
      <Newsletter />
      <BrandStory />

      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        {/* Top band */}
        <div className="grid gap-10 border-b border-latte/40 py-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <Link to="/" className="inline-flex items-center gap-4" aria-label="ShopScale — home">
            <span className="h-14 w-[4px] border-x-2 border-espresso/80" aria-hidden />
            <span className="flex flex-col items-center leading-none">
              <span className="font-display text-4xl font-semibold tracking-[0.06em] text-espresso md:text-5xl">SHOPSCALE</span>
              <span className="mt-1.5 font-display text-lg italic text-mocha md:text-xl">a world woven in tradition</span>
            </span>
            <span className="h-14 w-[4px] border-x-2 border-espresso/80" aria-hidden />
          </Link>

          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-[0.24em] text-darkroast">Get in touch</p>
              <div className="flex flex-wrap gap-2.5">
                <a href="tel:+918000000000" className="inline-flex items-center gap-2 rounded-full border border-latte/60 bg-ivory px-4 py-2.5 text-sm text-darkroast transition-colors hover:border-espresso hover:bg-white">
                  <Phone className="h-4 w-4 text-mocha" aria-hidden /> +91 80 0000 0000
                </a>
                <a href="https://wa.me/918000000000" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-latte/60 bg-ivory px-4 py-2.5 text-sm text-darkroast transition-colors hover:border-espresso hover:bg-white">
                  <MessageCircle className="h-4 w-4 text-olivesage" aria-hidden /> WhatsApp us
                </a>
                <a href="mailto:care@shopscale.example" aria-label="Email care@shopscale.example" className="inline-flex items-center gap-2 rounded-full border border-latte/60 bg-ivory px-4 py-2.5 text-sm text-darkroast transition-colors hover:border-espresso hover:bg-white">
                  <Mail className="h-4 w-4 text-mocha" aria-hidden /> care@shopscale.example
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-[0.24em] text-darkroast">Follow us</p>
              <div className="flex flex-wrap gap-2.5">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`ShopScale on ${s.label}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-latte/60 bg-ivory text-espresso transition-all hover:-translate-y-0.5 hover:border-espresso hover:bg-espresso hover:text-cream"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-darkroast">{TITLE_KEY[col.title] ? t(TITLE_KEY[col.title]) : col.title}</h3>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="group inline-flex items-center gap-1.5 text-[15px] text-warmgray transition-colors hover:text-espresso">
                      <span className="h-px w-0 bg-terracotta transition-all group-hover:w-3" aria-hidden />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-darkroast">Our Studios</h3>
            <div className="space-y-5 text-sm leading-relaxed text-warmgray">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso">Bengaluru · Flagship Studio</p>
                <p className="mt-1.5">Indiranagar, Bengaluru, Karnataka</p>
                <a href="https://maps.google.com/?q=Indiranagar+Bengaluru" target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-medium text-espresso underline underline-offset-4 hover:text-terracotta">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> Get directions
                </a>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso">Varanasi · Weaving Partner Hub</p>
                <p className="mt-1.5">Madanpura, Varanasi, Uttar Pradesh</p>
                <a href="https://maps.google.com/?q=Madanpura+Varanasi" target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-medium text-espresso underline underline-offset-4 hover:text-terracotta">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> Get directions
                </a>
              </div>
              <p className="text-[11px] text-mutedbrown">Demo locations for this prototype storefront.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-latte/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 lg:px-6">
          <div className="flex flex-wrap items-center gap-2" aria-label="Payment methods (placeholders)">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mutedbrown">Payments (coming soon)</span>
            {PAYMENTS.map((p) => <span key={p} className="border border-latte/60 bg-ivory px-2.5 py-1 text-[10px] font-semibold tracking-wide text-warmgray">{p}</span>)}
          </div>
          <p className="text-[11px] text-mutedbrown">Demo storefront — no payments are processed.</p>
        </div>
      </div>
      <div className="bg-espresso text-champagne">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs sm:flex-row lg:px-6">
          <p>© {new Date().getFullYear()} ShopScale. Crafted with care in India.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/about#legal" className="hover:text-gold">Privacy</Link>
            <Link to="/about#legal" className="hover:text-gold">Terms</Link>
            <button onClick={() => setLocale(locale === "en" ? "ta" : "en")} className="inline-flex items-center gap-1 hover:text-gold" aria-label="Switch language">
              <Globe className="h-3 w-3" aria-hidden /> {locale === "en" ? "தமிழ்" : "English"} <span className="text-stone">(beta)</span>
            </button>
            <Link to="/#newsletter" className="inline-flex items-center gap-1 hover:text-gold">Newsletter <ArrowRight className="h-3 w-3" aria-hidden /></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
