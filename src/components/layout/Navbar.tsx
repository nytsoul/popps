import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, ChevronRight, Clock, Headphones, Heart, Menu, Search, ShoppingBag, Truck, User, X, GitCompareArrows, Globe } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "../../data/navigation";
import { STORE_POLICY } from "../../data/catalogue";
import { useStore } from "../../hooks/useStore";
import { inr } from "../../lib/format";
import { searchService } from "../../services";
import { cn } from "../../utils/cn";
import type { I18nKey } from "../../lib/i18n";

/* ================================ Search ================================ */

function SearchBox({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const { t } = useStore();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => searchService.recent());
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const s = searchService.suggest(term);
  const hasAny = s.products.length > 0 || s.terms.length > 0 || !!s.didYouMean || (!term && recent.length > 0) || !!term;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (to: string) => { setOpen(false); setTerm(""); onDone?.(); navigate(to); };
  const submit = (q: string) => {
    if (!q.trim()) return;
    searchService.remember(q);
    setRecent(searchService.recent());
    go(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); submit(term); }}
        className="flex items-center gap-2.5 rounded-sm bg-cream px-4 py-2.5 ring-1 ring-transparent transition-all focus-within:bg-white focus-within:ring-latte"
      >
        <Search className="h-4 w-4 shrink-0 text-mutedbrown" aria-hidden />
        <input
          value={term}
          autoFocus={autoFocus}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t("search_placeholder")}
          aria-label="Search sarees by name, region, fabric, technique or colour"
          aria-autocomplete="list"
          className="w-full bg-transparent text-sm text-darkroast placeholder:text-mutedbrown focus:outline-none"
        />
        {term && (
          <button type="button" onClick={() => setTerm("")} aria-label="Clear search" className="text-mutedbrown hover:text-darkroast">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </form>
      <AnimatePresence>
        {open && hasAny && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-[60] mt-1.5 max-h-[70vh] overflow-y-auto border border-sand bg-white shadow-lift md:min-w-[380px]"
            role="listbox"
          >
            {!term && recent.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 pb-1 pt-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-mutedbrown">Recent searches</p>
                  <button onClick={() => { searchService.clearRecent(); setRecent([]); }} className="text-[10px] text-terracotta hover:underline">Clear</button>
                </div>
                {recent.map((r) => (
                  <button key={r} onClick={() => submit(r)} className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-warmgray hover:bg-cream">
                    <Clock className="h-3.5 w-3.5 text-stone" aria-hidden /> {r}
                  </button>
                ))}
              </div>
            )}
            {s.didYouMean && (
              <button onClick={() => submit(s.didYouMean!)} className="block w-full border-b border-sand/60 bg-cream/60 px-3 py-2.5 text-left text-sm text-warmgray hover:bg-cream">
                Did you mean <span className="font-medium text-espresso underline underline-offset-2">{s.didYouMean}</span>?
              </button>
            )}
            {s.terms.length > 0 && (
              <div className="p-2">
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-mutedbrown">Traditions & regions</p>
                {s.terms.map((t) => (
                  <button key={t.to} onClick={() => go(t.to)} className="flex w-full items-center justify-between px-2 py-2 text-left text-sm text-darkroast hover:bg-cream">
                    {t.label} <span className="text-[11px] text-mutedbrown">{t.hint}</span>
                  </button>
                ))}
              </div>
            )}
            {s.products.map((p) => (
              <button key={p.id} onClick={() => go(`/product/${p.slug}`)} className="flex w-full items-center gap-3 border-t border-sand/60 px-3 py-2 text-left hover:bg-cream">
                <img src={p.images[0]} alt="" className="h-12 w-9 rounded-sm object-cover" loading="lazy" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-darkroast">{p.name}</span>
                  <span className="block truncate text-xs text-mutedbrown">{p.variety} · {p.state}</span>
                </span>
                <span className="text-xs font-medium text-espresso">{inr(p.price)}</span>
              </button>
            ))}
            {term && (
              <button onClick={() => submit(term)} className="flex w-full items-center justify-between border-t border-sand bg-cream/60 px-3 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-espresso hover:bg-cream">
                Search all for “{term}” <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================ Logo ================================ */

function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="6" y="6" width="28" height="28" transform="rotate(45 20 20)" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="12" y="12" width="16" height="16" transform="rotate(45 20 20)" fill="none" stroke="#D4A373" strokeWidth="1.2" />
      <path d="M8 20h24M20 8v24" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.5 2" />
      <circle cx="20" cy="20" r="2.4" fill="#C46A4B" />
    </svg>
  );
}

function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 leading-none" aria-label="ShopScale — World of Sarees, home">
      <Emblem className={cn("shrink-0 text-espresso transition-all", compact ? "h-7 w-7" : "h-8 w-8 sm:h-10 sm:w-10")} />
      <span className="flex flex-col items-start">
        <span className={cn("font-display font-semibold tracking-[0.06em] text-espresso transition-all", compact ? "text-xl sm:text-2xl" : "text-[1.45rem] sm:text-[1.9rem]")}>SHOPSCALE</span>
        <span className={cn("font-display italic text-mocha transition-all", compact ? "hidden" : "mt-0.5 hidden text-[12.5px] sm:block")}>a world woven in tradition</span>
      </span>
    </Link>
  );
}

/* ============================== Mega panel ============================== */

function MegaPanel({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const [active, setActive] = useState(0);
  const groups = item.groups ?? [];
  const multi = groups.length > 1;
  const group = groups[active];
  if (!group) return null;

  return (
    <div
      className={cn("mx-auto grid max-w-7xl gap-0 px-6", multi ? "grid-cols-[250px_1fr_280px]" : "grid-cols-[1fr_280px]")}
    >
      {multi && (
        <ul className="border-r border-sand py-7 pr-4" role="menu" aria-label={`${item.label} sections`}>
          {groups.map((g, i) => (
            <li key={g.title} role="none">
              <button
                role="menuitem"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-expanded={active === i}
                className={cn(
                  "group flex w-full items-center justify-between border-l-2 px-4 py-3 text-left text-[15px] transition-all",
                  active === i
                    ? "border-terracotta bg-cream font-medium text-espresso"
                    : "border-transparent text-warmgray hover:bg-cream/60 hover:text-espresso"
                )}
              >
                {g.title}
                <ChevronRight className={cn("h-4 w-4 transition-transform", active === i ? "translate-x-0.5 text-terracotta" : "text-stone")} aria-hidden />
              </button>
            </li>
          ))}
          <li className="mt-4 px-4">
            <Link to={item.to} onClick={onNavigate} className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso hover:text-terracotta">
              View all {item.label} <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </li>
        </ul>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={group.title}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn("py-7", multi ? "px-10" : "pr-10")}
        >
          <p className="eyebrow">{item.label}</p>
          <h3 className="mt-1.5 font-display text-2xl text-darkroast">{group.title}</h3>
          <p className="mt-1 text-xs text-mutedbrown">{group.blurb}</p>
          <ul className="mt-6 grid max-h-[52vh] grid-cols-2 gap-x-10 gap-y-1 overflow-y-auto xl:grid-cols-3">
            {group.links.map((l) => (
              <li key={l.label}>
                <Link
                  to={l.to}
                  onClick={onNavigate}
                  className="group block border-b border-sand/60 py-2.5 transition-colors hover:border-latte"
                >
                  <span className="flex items-center justify-between text-sm text-darkroast group-hover:text-espresso">
                    {l.label}
                    <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-terracotta opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                  </span>
                  {l.note && <span className="mt-0.5 block text-[11px] text-mutedbrown">{l.note}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {!multi && (
            <Link to={item.to} onClick={onNavigate} className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso hover:text-terracotta">
              View all {item.label} <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </motion.div>
      </AnimatePresence>

      {item.featured && (
        <Link to={item.featured.to} onClick={onNavigate} className="group my-7 block overflow-hidden rounded-card bg-sand">
          <div className="relative h-full min-h-[300px]">
            <img src={item.featured.image} alt={item.featured.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-darkroast/85 via-darkroast/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Featured</p>
              <p className="mt-1 font-display text-lg leading-snug text-ivory">{item.featured.title}</p>
              <p className="mt-1 text-[11px] text-champagne">{item.featured.caption}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory">
                Shop now <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}


const NAV_LABEL: Record<string, I18nKey> = {
  "Shop All": "nav_shop_all",
  "By Region": "nav_region",
  "By Fabric": "nav_fabric",
  "By Technique": "nav_weave",
  "By Occasion": "nav_occasion",
  "Collections": "nav_collections",
  "Fabric Guide": "nav_guide",
  "Heritage Stories": "nav_stories",
};

function LocaleToggle({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = useStore();
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ta" : "en")}
      className={compact ? "flex items-center gap-1.5 text-xs text-mutedbrown hover:text-espresso" : "relative flex h-10 w-10 items-center justify-center rounded-full text-warmgray transition-colors hover:bg-cream hover:text-espresso"}
      aria-label={`${t("language")}: ${locale === "en" ? "English" : "Tamil (beta)"} — switch language`}
      title={`${t("language")} (${t("tamil_beta")})`}
    >
      <Globe className="h-5 w-5" aria-hidden />
      <span className={compact ? "text-xs font-semibold uppercase" : "absolute bottom-0.5 right-0.5 rounded-full bg-sand px-1 text-[8px] font-bold uppercase leading-none"}>{locale}</span>
    </button>
  );
}

/* ============================ Mobile drawer ============================ */

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { wishlist, user, compareIds, t } = useStore();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.28 }}
      className="fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-sm flex-col bg-ivory lg:hidden"
      role="dialog" aria-label="Navigation menu"
    >
      <div className="flex items-center justify-between border-b border-sand px-5 py-4">
        <Wordmark compact />
        <button onClick={onClose} aria-label="Close menu" className="p-1 text-warmgray"><X className="h-5 w-5" aria-hidden /></button>
      </div>
      <div className="border-b border-sand px-5 py-3"><SearchBox onDone={onClose} /></div>
      <nav className="flex-1 overflow-y-auto px-5 py-2" aria-label="Mobile">
        {NAV_ITEMS.map((item) => {
          const hasGroups = !!item.groups?.length;
          const expanded = openItem === item.label;
          if (!hasGroups) {
            return (
              <Link key={item.label} to={item.to} onClick={onClose} className={cn("flex items-center justify-between border-b border-sand/70 py-3.5 text-[13px] font-medium uppercase tracking-[0.12em]", item.highlight ? "text-terracotta" : "text-darkroast")}>
                {item.label} <ChevronRight className="h-4 w-4 text-stone" aria-hidden />
              </Link>
            );
          }
          return (
            <div key={item.label} className="border-b border-sand/70">
              <button
                onClick={() => { setOpenItem(expanded ? null : item.label); setOpenGroup(null); }}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between py-3.5 text-[13px] font-medium uppercase tracking-[0.12em] text-darkroast"
              >
                {NAV_LABEL[item.label] ? t(NAV_LABEL[item.label]) : item.label}
                <ChevronDown className={cn("h-4 w-4 text-stone transition-transform", expanded && "rotate-180 text-espresso")} aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="pb-3 pl-3">
                      {item.groups!.map((g) => {
                        const gOpen = openGroup === g.title || item.groups!.length === 1;
                        return (
                          <div key={g.title}>
                            {item.groups!.length > 1 && (
                              <button
                                onClick={() => setOpenGroup(gOpen ? null : g.title)}
                                aria-expanded={gOpen}
                                className="flex w-full items-center justify-between py-2.5 text-sm text-warmgray"
                              >
                                {g.title}
                                <ChevronRight className={cn("h-4 w-4 text-stone transition-transform", gOpen && "rotate-90 text-terracotta")} aria-hidden />
                              </button>
                            )}
                            {gOpen && (
                              <ul className="mb-2 border-l border-latte/60 pl-4">
                                {g.links.map((l) => (
                                  <li key={l.label}>
                                    <Link to={l.to} onClick={onClose} className="block py-2 text-sm text-darkroast hover:text-espresso">{l.label}</Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                      <Link to={item.to} onClick={onClose} className="mt-1 inline-flex items-center gap-1 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-terracotta">
                        View all {item.label} <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        <Link to="/compare" onClick={onClose} className="flex items-center justify-between border-b border-sand/70 py-3.5 text-sm text-darkroast">
          Compare Sarees {compareIds.length > 0 && `(${compareIds.length})`} <GitCompareArrows className="h-4 w-4 text-stone" aria-hidden />
        </Link>
        <Link to="/guide" onClick={onClose} className="flex items-center justify-between border-b border-sand/70 py-3.5 text-sm text-darkroast">
          Fabric & Weaving Guide <ArrowRight className="h-4 w-4 text-stone" aria-hidden />
        </Link>
        <Link to="/wishlist" onClick={onClose} className="flex items-center justify-between border-b border-sand/70 py-3.5 text-sm text-darkroast">
          Wishlist ({wishlist.length}) <Heart className="h-4 w-4 text-stone" aria-hidden />
        </Link>
        <Link to={user ? "/account" : "/login"} onClick={onClose} className="flex items-center justify-between py-3.5 text-sm text-darkroast">
          {user ? `My Account — ${user.name}` : "Sign in / Register"} <User className="h-4 w-4 text-stone" aria-hidden />
        </Link>
      </nav>
      <div className="border-t border-sand px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-mutedbrown">A world woven in tradition</p>
        <div className="mt-2"><LocaleToggle compact /></div>
        <Link to="/admin" onClick={onClose} className="mt-2 block text-xs text-mocha underline underline-offset-4">Engineering & Admin Dashboard</Link>
      </div>
    </motion.div>
  );
}

/* ================================ Navbar ================================ */

const ANNOUNCEMENTS = [
  "Celebrate India's weaving heritage — 140+ traditions catalogued",
  ...(STORE_POLICY.freeShippingThreshold ? [`Free shipping on orders above ${inr(STORE_POLICY.freeShippingThreshold)}`] : []),
  "Discover handpicked regional collections",
];

export default function Navbar() {
  const { cartCount, wishlist, setCartOpen, user, compareIds, t } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [announce, setAnnounce] = useState(0);
  const closeTimer = useRef<number | null>(null);
  const location = useLocation();
  const current = location.pathname + location.search;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setAnnounce((a) => (a + 1) % ANNOUNCEMENTS.length), 4500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); setOpenMenu(null); }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cancelClose = () => { if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 140);
  }, []);
  const openNow = (label: string | null) => { cancelClose(); setOpenMenu(label); };

  const isActive = (to: string) => {
    if (!to.includes("?")) return location.pathname === to;
    return current === to || current.startsWith(to + "&");
  };

  const openItem = NAV_ITEMS.find((n) => n.label === openMenu && n.groups?.length);
  const iconBtn = "relative flex h-10 w-10 items-center justify-center rounded-full text-warmgray transition-colors hover:bg-cream hover:text-espresso";

  return (
    <>
      {/* Announcement */}
      <div className="bg-espresso text-cream">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-center gap-2 overflow-hidden px-4 text-[11px] tracking-[0.1em]">
          <Truck className="h-3.5 w-3.5 shrink-0 text-champagne" aria-hidden />
          <AnimatePresence mode="wait">
            <motion.p
              key={announce}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="truncate"
            >
              {ANNOUNCEMENTS[announce]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <header className={cn("sticky top-0 z-40 bg-white transition-shadow", (scrolled || openItem) && "shadow-card")}>
        {/* Row 1: search · logo · actions */}
        <div className={cn("mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 transition-all lg:px-8", scrolled ? "py-2.5" : "py-3.5 lg:py-5")}>
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className={cn(iconBtn, "lg:hidden")}>
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <button onClick={() => setSearchOpen((s) => !s)} aria-label="Toggle search" className={cn(iconBtn, "md:hidden")}>
              <Search className="h-5 w-5" aria-hidden />
            </button>
            <div className="hidden w-full max-w-[340px] md:block"><SearchBox /></div>
          </div>

          <Wordmark compact={scrolled} />

          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <span className="hidden sm:flex"><LocaleToggle /></span>
            <Link to="/contact" className={cn(iconBtn, "hidden sm:flex")} aria-label="Customer support" title="Customer support">
              <Headphones className="h-5 w-5" aria-hidden />
            </Link>
            <Link to="/compare" className={iconBtn} aria-label={`Compare sarees, ${compareIds.length} selected`} title="Compare">
              <GitCompareArrows className="h-5 w-5" aria-hidden />
              {compareIds.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mocha px-1 text-[9px] font-semibold text-ivory">{compareIds.length}</span>
              )}
            </Link>
            <Link to="/wishlist" className={iconBtn} aria-label={`Wishlist, ${wishlist.length} saved`} title="Wishlist">
              <Heart className="h-5 w-5" aria-hidden />
              {wishlist.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[9px] font-semibold text-ivory">{wishlist.length}</span>
              )}
            </Link>
            <Link to={user ? "/account" : "/login"} className={cn(iconBtn, "hidden sm:flex")} aria-label={user ? `Account — ${user.name}` : "Sign in"} title={user ? user.name : "Sign in"}>
              <User className="h-5 w-5" aria-hidden />
              {user && <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-olivesage ring-2 ring-white" aria-hidden />}
            </Link>
            <button onClick={() => setCartOpen(true)} className={iconBtn} aria-label={`Shopping bag, ${cartCount} items`} title="Bag">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-espresso px-1 text-[9px] font-semibold text-cream">{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: category navigation (desktop) */}
        <nav aria-label="Primary" className="relative hidden border-t border-sand lg:block" onMouseLeave={scheduleClose}>
          <ul className="mx-auto flex max-w-[1440px] items-center justify-center gap-x-5 px-6 xl:gap-x-8">
            {NAV_ITEMS.map((item) => {
              const hasMenu = !!item.groups?.length;
              const active = isActive(item.to);
              const expanded = openMenu === item.label && hasMenu;
              return (
                <li
                  key={item.label}
                  onMouseEnter={() => openNow(hasMenu ? item.label : null)}
                  className="relative"
                >
                  <div className="flex items-center">
                    <Link
                      to={item.to}
                      className={cn(
                        "relative flex items-center gap-1 py-3.5 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors",
                        item.highlight ? "text-terracotta hover:text-espresso" : expanded || active ? "text-espresso" : "text-warmgray hover:text-espresso"
                      )}
                    >
                      {NAV_LABEL[item.label] ? t(NAV_LABEL[item.label]) : item.label}
                      <span
                        className={cn(
                          "absolute inset-x-0 bottom-2 h-[1.5px] origin-left bg-espresso transition-transform duration-300",
                          expanded || active ? "scale-x-100" : "scale-x-0"
                        )}
                        aria-hidden
                      />
                    </Link>
                    {hasMenu && (
                      <button
                        onClick={() => openNow(expanded ? null : item.label)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Close" : "Open"} ${item.label} menu`}
                        className="ml-0.5 p-0.5 text-stone hover:text-espresso"
                      >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180 text-espresso")} aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <AnimatePresence>
            {openItem && (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-x-0 top-full h-screen bg-darkroast/25"
                  onMouseEnter={scheduleClose}
                  onClick={() => setOpenMenu(null)}
                  aria-hidden
                />
                <motion.div
                  key="panel"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  onMouseEnter={cancelClose}
                  className="absolute inset-x-0 top-full border-t border-sand bg-ivory shadow-lift"
                >
                  <MegaPanel key={openItem.label} item={openItem} onNavigate={() => setOpenMenu(null)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </nav>

        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-sand md:hidden">
              <div className="px-4 py-3"><SearchBox autoFocus onDone={() => setSearchOpen(false)} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile quick category chips */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-sand px-4 py-2.5 lg:hidden">
          {NAV_ITEMS.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className={cn(
                "shrink-0 border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em]",
                isActive(n.to) ? "border-espresso bg-espresso text-cream" : n.highlight ? "border-terracotta/50 text-terracotta" : "border-sand text-warmgray"
              )}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-darkroast/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
            <MobileMenu onClose={() => setMobileOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}